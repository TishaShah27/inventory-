import { supabase } from "./supabase";
import {
  fetchCustomersByIds,
  fetchCustomerByCustomerId,
  updateCustomer,
  isGujaratSchemeCustomer,
} from "./customerService";
import { addYearsIso } from "./utils";
import type { Customer } from "@/data/customersStore";
import {
  NM_STAGES,
  NM_DONE_STAGE_IDX,
  NM_DONE_TTL_MS,
  type NmStageHistoryEntry,
} from "@/data/netMeteringKanbanStore";

// For "New" customers, the Net Metering completion date becomes their System
// Warranty Start Date (End Date = Start + 5 years). "Old" customers set their
// warranty dates manually on the customer form, so they're left untouched.
export async function applyWarrantyOnNetMeteringComplete(
  customerId: string,
  completedAtIso: string,
): Promise<void> {
  const customer = await fetchCustomerByCustomerId(customerId);
  if (!customer || customer.customerType === "Old") return;

  const warrantyStartDate = completedAtIso.slice(0, 10);
  const warrantyEndDate = addYearsIso(warrantyStartDate, 5);
  await updateCustomer(customer.id, { warrantyStartDate, warrantyEndDate });
}

type KanbanState = { stageIndex: number; stageName: string; stageEnteredAt: string };

export type NmPageData = {
  customers: Customer[];
  kanbanStates: Record<string, KanbanState>;
};

export async function fetchNmPageData(): Promise<NmPageData> {
  const { data, error } = await supabase
    .from("net_metering_kanban_cards")
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

export async function fetchAllNmStates(
  customerIds: string[],
): Promise<Record<string, KanbanState>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("net_metering_kanban_cards")
    .select("customer_id, stage_index, stage_name, stage_entered_at")
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, KanbanState> = {};
  for (const row of data ?? []) {
    result[row.customer_id] = {
      stageIndex: row.stage_index,
      stageName: row.stage_name,
      stageEnteredAt: row.stage_entered_at,
    };
  }
  return result;
}

export async function insertNmCardIfAbsent(
  customerId: string,
  stageEnteredAt: string,
): Promise<void> {
  const { error } = await supabase.from("net_metering_kanban_cards").upsert(
    {
      customer_id: customerId,
      stage_index: 0,
      stage_name: "Pending Meter Installation",
      stage_entered_at: stageEnteredAt,
    },
    { onConflict: "customer_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function upsertNmState(
  customerId: string,
  stageIndex: number,
  stageName: string,
  stageEnteredAt: string,
): Promise<void> {
  const { error } = await supabase.from("net_metering_kanban_cards").upsert(
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

export async function insertNmHistory(
  customerId: string,
  entry: NmStageHistoryEntry,
): Promise<void> {
  const { error } = await supabase.from("net_metering_kanban_history").insert({
    customer_id: customerId,
    from_stage_idx: entry.fromStageIdx,
    to_stage_idx: entry.toStageIdx,
    from_stage_name: entry.fromStageName,
    to_stage_name: entry.toStageName,
    moved_at: entry.movedAt,
    moved_by_name: entry.movedByName ?? null,
    notes: entry.notes ?? null,
    meter_install_date: entry.meterInstallDate ?? null,
    wifi_comment: entry.wifiComment ?? null,
  });
  if (error) throw error;
}

// Auto-advances a customer from "Net Meter Installed" (index 1) to
// "Net Metering Completed" (index 2) once their assigned Net-Meter Start task
// is marked completed. Only fires if they're still exactly at stage 1 — if
// they've since been moved elsewhere (or already advanced), it's a no-op.
export async function tryAdvanceMeterInstallStage(
  customerId: string,
  movedByName?: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("net_metering_kanban_cards")
    .select("stage_index")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error || !data || data.stage_index !== 1) return false;

  const stageEnteredAt = new Date().toISOString();
  const toStageIdx = 2;

  await upsertNmState(customerId, toStageIdx, NM_STAGES[toStageIdx], stageEnteredAt);
  await insertNmHistory(customerId, {
    fromStageIdx: 1,
    toStageIdx,
    fromStageName: NM_STAGES[1],
    toStageName: NM_STAGES[toStageIdx],
    movedAt: stageEnteredAt,
    movedByName,
    notes: "Auto-advanced — Net Meter Start task marked completed by field staff.",
  });

  // Subsidy enrollment now happens off the Intimation kanban's "Intimation
  // Approved" stage, not off Net Metering completion — only the warranty
  // date stays tied to this stage.
  await applyWarrantyOnNetMeteringComplete(customerId, stageEnteredAt);

  return true;
}

// Prunes net_metering_kanban_cards rows that have sat in "Net Metering Completed" for over
// 24h. Runs lazily on Net Metering page mount (no server/cron in this app). History is
// untouched — Subsidy's stage-0 seed already happened at the transition moment, so
// deleting the NM row later doesn't affect Subsidy.
export async function deleteExpiredNmDoneCards(): Promise<void> {
  const cutoff = new Date(Date.now() - NM_DONE_TTL_MS).toISOString();
  const { error } = await supabase
    .from("net_metering_kanban_cards")
    .delete()
    .eq("stage_index", NM_DONE_STAGE_IDX)
    .lt("stage_entered_at", cutoff);
  if (error) throw error;
}

export async function fetchNmHistory(customerId: string): Promise<NmStageHistoryEntry[]> {
  const { data, error } = await supabase
    .from("net_metering_kanban_history")
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
    meterInstallDate: row.meter_install_date ?? undefined,
    wifiComment: row.wifi_comment ?? undefined,
  }));
}
