import { supabase } from "./supabase";
import {
  FEASIBILITY_DONE_STAGE_IDX,
  FEASIBILITY_DONE_TTL_MS,
  type FeasibilityKanbanState,
  type FeasibilityHistoryEntry,
} from "@/data/feasibilityStore";

export async function fetchFeasibilityStates(
  customerIds: string[],
): Promise<Record<string, FeasibilityKanbanState>> {
  const { data, error } = await supabase
    .from("feasibility_kanban_cards")
    .select(
      "customer_id, stage_index, stage_entered_at, notes, date, pay_estimate_date, estimate_amount, sr_number",
    )
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, FeasibilityKanbanState> = {};
  for (const row of data ?? []) {
    result[row.customer_id] = {
      stageIndex: row.stage_index,
      stageEnteredAt: row.stage_entered_at,
      notes: row.notes ?? undefined,
      date: row.date ?? undefined,
      payEstimateDate: row.pay_estimate_date ?? undefined,
      estimateAmount: row.estimate_amount ?? undefined,
      srNumber: row.sr_number ?? undefined,
    };
  }
  return result;
}

// Only inserts if no row exists yet — never overwrites existing feasibility progress
export async function insertFeasibilityCardIfAbsent(
  customerId: string,
  stageEnteredAt: string,
): Promise<void> {
  const { error } = await supabase
    .from("feasibility_kanban_cards")
    .insert({ customer_id: customerId, stage_index: 0, stage_entered_at: stageEnteredAt })
    .select();
  // 23505 = unique_violation (row already exists) — safe to ignore
  if (error && error.code !== "23505") throw error;
}

export async function upsertFeasibilityState(
  customerId: string,
  stageIndex: number,
  stageEnteredAt: string,
  notes?: string,
  date?: string,
  payEstimateDate?: string,
  estimateAmount?: string,
  srNumber?: string,
): Promise<void> {
  const { error } = await supabase.from("feasibility_kanban_cards").upsert(
    {
      customer_id: customerId,
      stage_index: stageIndex,
      stage_entered_at: stageEnteredAt,
      notes: notes ?? null,
      date: date ?? null,
      pay_estimate_date: payEstimateDate ?? null,
      estimate_amount: estimateAmount ?? null,
      sr_number: srNumber ?? null,
    },
    { onConflict: "customer_id" },
  );
  if (error) throw error;
}

// Prunes feasibility_kanban_cards rows that have sat in "Estimate Paid" for over 24h.
// Runs lazily on Feasibility page mount (no server/cron in this app). History is untouched.
export async function deleteExpiredFeasibilityDoneCards(): Promise<void> {
  const cutoff = new Date(Date.now() - FEASIBILITY_DONE_TTL_MS).toISOString();
  const { error } = await supabase
    .from("feasibility_kanban_cards")
    .delete()
    .eq("stage_index", FEASIBILITY_DONE_STAGE_IDX)
    .lt("stage_entered_at", cutoff);
  if (error) throw error;
}

export async function insertFeasibilityHistory(
  customerId: string,
  entry: FeasibilityHistoryEntry,
): Promise<void> {
  const { error } = await supabase.from("feasibility_kanban_history").insert({
    customer_id: customerId,
    from_stage_idx: entry.fromStageIdx,
    to_stage_idx: entry.toStageIdx,
    from_stage_name: entry.fromStageName,
    to_stage_name: entry.toStageName,
    moved_at: entry.movedAt,
    moved_by_name: entry.movedByName ?? null,
    notes: entry.notes ?? null,
    date: entry.date ?? null,
    pay_estimate_date: entry.payEstimateDate ?? null,
    estimate_amount: entry.estimateAmount ?? null,
    sr_number: entry.srNumber ?? null,
  });
  if (error) throw error;
}

export async function fetchFeasibilityHistory(
  customerId: string,
): Promise<FeasibilityHistoryEntry[]> {
  const { data, error } = await supabase
    .from("feasibility_kanban_history")
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
    date: row.date ?? undefined,
    payEstimateDate: row.pay_estimate_date ?? undefined,
    estimateAmount: row.estimate_amount ?? undefined,
    srNumber: row.sr_number ?? undefined,
  }));
}
