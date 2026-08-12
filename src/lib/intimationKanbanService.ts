import { supabase } from "./supabase";
import {
  INTIMATION_KANBAN_STAGES,
  INTIMATION_APPROVED_STAGE_IDX,
  INTIMATION_DONE_TTL_MS,
  type IntimationStageHistoryEntry,
} from "@/data/intimationKanbanStore";

type KanbanState = { stageIndex: number; stageName: string; stageEnteredAt: string };

export async function fetchIntimationKanbanStates(
  customerIds: string[],
): Promise<Record<string, KanbanState>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("intimation_kanban_cards")
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

export async function insertIntimationKanbanCardIfAbsent(
  customerId: string,
  stageEnteredAt: string,
): Promise<void> {
  const { error } = await supabase.from("intimation_kanban_cards").upsert(
    {
      customer_id: customerId,
      stage_index: 0,
      stage_name: INTIMATION_KANBAN_STAGES[0],
      stage_entered_at: stageEnteredAt,
    },
    { onConflict: "customer_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function upsertIntimationKanbanState(
  customerId: string,
  stageIndex: number,
  stageName: string,
  stageEnteredAt: string,
): Promise<void> {
  const { error } = await supabase.from("intimation_kanban_cards").upsert(
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

export async function insertIntimationKanbanHistory(
  customerId: string,
  entry: IntimationStageHistoryEntry,
): Promise<void> {
  const { error } = await supabase.from("intimation_kanban_history").insert({
    customer_id: customerId,
    from_stage_idx: entry.fromStageIdx,
    to_stage_idx: entry.toStageIdx,
    from_stage_name: entry.fromStageName,
    to_stage_name: entry.toStageName,
    moved_at: entry.movedAt,
    moved_by_name: entry.movedByName ?? null,
    notes: entry.notes ?? null,
  });
  if (error) throw error;
}

// Prunes intimation_kanban_cards rows that have sat in "Intimation Approved" for
// over 24h. Runs lazily on Intimation page mount (no server/cron in this app).
// Subsidy's stage-0 seed already happened at the transition moment (see
// confirmKMove), so deleting the row later doesn't affect Subsidy.
export async function deleteExpiredIntimationDoneCards(): Promise<void> {
  const cutoff = new Date(Date.now() - INTIMATION_DONE_TTL_MS).toISOString();
  const { error } = await supabase
    .from("intimation_kanban_cards")
    .delete()
    .eq("stage_index", INTIMATION_APPROVED_STAGE_IDX)
    .lt("stage_entered_at", cutoff);
  if (error) throw error;
}

export async function fetchIntimationKanbanHistory(
  customerId: string,
): Promise<IntimationStageHistoryEntry[]> {
  const { data, error } = await supabase
    .from("intimation_kanban_history")
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
  }));
}
