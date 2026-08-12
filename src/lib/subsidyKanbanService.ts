import { supabase } from "./supabase";
import { fetchCustomersByIds, isGujaratSchemeCustomer } from "./customerService";
import type { Customer } from "@/data/customersStore";
import {
  SUBSIDY_DONE_STAGE_IDX,
  SUBSIDY_DONE_TTL_MS,
  type SubsidyStageHistoryEntry,
} from "@/data/subsidyKanbanStore";

type KanbanState = { stageIndex: number; stageName: string; stageEnteredAt: string };

export type SubsidyPageData = {
  customers: Customer[];
  kanbanStates: Record<string, KanbanState>;
};

export async function fetchSubsidyPageData(): Promise<SubsidyPageData> {
  const { data, error } = await supabase
    .from("subsidy_kanban_cards")
    .select("customer_id, stage_index, stage_name, stage_entered_at")
    .order("stage_entered_at", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) return { customers: [], kanbanStates: {} };

  const ids = rows.map((r) => r.customer_id);
  const customersRaw = await fetchCustomersByIds(ids);
  const customers = customersRaw.filter((c) => !isGujaratSchemeCustomer(c));
  const keepIds = new Set(customers.map((c) => c.customerId));
  const kanbanStates = Object.fromEntries(
    rows
      .filter((r) => keepIds.has(r.customer_id))
      .map((r) => [
        r.customer_id,
        {
          stageIndex: r.stage_index,
          stageName: r.stage_name,
          stageEnteredAt: r.stage_entered_at,
        },
      ]),
  );
  return { customers, kanbanStates };
}

export async function fetchAllSubsidyStates(
  customerIds: string[],
): Promise<Record<string, { stageIndex: number; stageName: string }>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("subsidy_kanban_cards")
    .select("customer_id, stage_index, stage_name")
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, { stageIndex: number; stageName: string }> = {};
  for (const row of data ?? [])
    result[row.customer_id] = { stageIndex: row.stage_index, stageName: row.stage_name };
  return result;
}

export async function upsertSubsidyState(
  customerId: string,
  stageIndex: number,
  stageName: string,
  stageEnteredAt: string,
): Promise<void> {
  const { error } = await supabase
    .from("subsidy_kanban_cards")
    .upsert(
      {
        customer_id: customerId,
        stage_index: stageIndex,
        stage_name: stageName,
        stage_entered_at: stageEnteredAt,
      },
      { onConflict: "customer_id" },
    );
  if (error) throw error;
}

export async function insertSubsidyHistory(
  customerId: string,
  entry: SubsidyStageHistoryEntry,
): Promise<void> {
  const { error } = await supabase.from("subsidy_kanban_history").insert({
    customer_id: customerId,
    from_stage_idx: entry.fromStageIdx,
    to_stage_idx: entry.toStageIdx,
    from_stage_name: entry.fromStageName,
    to_stage_name: entry.toStageName,
    moved_at: entry.movedAt,
    moved_by_name: entry.movedByName ?? null,
    notes: entry.notes ?? null,
    stage_date: entry.stageDate ?? null,
    follow_date: entry.followDate ?? null,
    issue: entry.issue ?? null,
  });
  if (error) throw error;
}

// Prunes subsidy_kanban_cards rows that have sat in "Subsidy Disbursed" for over 24h.
// Runs lazily on Subsidy page mount (no server/cron in this app). History is untouched.
export async function deleteExpiredSubsidyDoneCards(): Promise<void> {
  const cutoff = new Date(Date.now() - SUBSIDY_DONE_TTL_MS).toISOString();
  const { error } = await supabase
    .from("subsidy_kanban_cards")
    .delete()
    .eq("stage_index", SUBSIDY_DONE_STAGE_IDX)
    .lt("stage_entered_at", cutoff);
  if (error) throw error;
}

export async function fetchSubsidyHistory(customerId: string): Promise<SubsidyStageHistoryEntry[]> {
  const { data, error } = await supabase
    .from("subsidy_kanban_history")
    .select("*")
    .eq("customer_id", customerId)
    .order("moved_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    fromStageIdx: row.from_stage_idx,
    toStageIdx: row.to_stage_idx,
    fromStageName: row.from_stage_name,
    toStageName: row.to_stage_name,
    movedAt: row.moved_at,
    movedByName: row.moved_by_name ?? undefined,
    notes: row.notes ?? undefined,
    stageDate: row.stage_date ?? undefined,
    followDate: row.follow_date ?? undefined,
    issue: row.issue ?? undefined,
  }));
}
