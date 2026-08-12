import { supabase } from "./supabase";
import { REG_FINAL_STAGE_IDX, REG_FINAL_STAGE_TTL_MS } from "@/data/registrationKanbanStore";
import type { KanbanState, RegStageHistoryEntry } from "@/data/registrationKanbanStore";

export async function fetchAllKanbanStates(
  customerIds: string[],
): Promise<Record<string, KanbanState>> {
  const { data, error } = await supabase
    .from("registration_kanban_cards")
    .select("customer_id, stage_index, stage_entered_at, notes, registration_done_at")
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, KanbanState> = {};
  for (const row of data ?? []) {
    result[row.customer_id] = {
      stageIndex: row.stage_index,
      stageEnteredAt: row.stage_entered_at,
      notes: row.notes ?? undefined,
      finalStageEnteredAt: row.registration_done_at ?? undefined,
    };
  }
  return result;
}

export async function upsertKanbanState(
  customerId: string,
  stageIndex: number,
  stageEnteredAt: string,
  notes?: string,
  finalStageEnteredAt?: string,
): Promise<void> {
  const { error } = await supabase.from("registration_kanban_cards").upsert(
    {
      customer_id: customerId,
      stage_index: stageIndex,
      stage_entered_at: stageEnteredAt,
      notes: notes ?? null,
      registration_done_at: finalStageEnteredAt ?? null,
    },
    { onConflict: "customer_id" },
  );
  if (error) throw error;
}

export async function insertKanbanHistory(
  customerId: string,
  entry: RegStageHistoryEntry,
): Promise<void> {
  const { error } = await supabase.from("registration_kanban_history").insert({
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
    missing_doc: entry.missingDoc ?? null,
    issue: entry.issue ?? null,
  });
  if (error) throw error;
}

// registration_kanban_cards only tracks the *active* pipeline — a customer's card is
// removed 24h after reaching "Bank Upload" (see deleteExpiredRegistrationFinalStageCards).
// registration_kanban_history is the permanent record and is never pruned, so any page
// that needs to know "did this customer ever finish registration" (regardless of how long
// ago) must check history, not the current-stage table.
export async function fetchRegistrationDoneCustomerIds(
  customerIds: string[],
): Promise<Set<string>> {
  if (customerIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("registration_kanban_history")
    .select("customer_id")
    .eq("to_stage_name", "Registration Done")
    .in("customer_id", customerIds);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.customer_id as string));
}

// Prunes registration_kanban_cards rows that have sat in "Bank Upload" (the pipeline's
// terminal stage) for over 24h. There's no server/cron in this app, so this runs lazily
// whenever the Registration page is visited. History is untouched — it's the permanent
// audit trail.
export async function deleteExpiredRegistrationFinalStageCards(): Promise<void> {
  const cutoff = new Date(Date.now() - REG_FINAL_STAGE_TTL_MS).toISOString();
  const { error } = await supabase
    .from("registration_kanban_cards")
    .delete()
    .eq("stage_index", REG_FINAL_STAGE_IDX)
    .lt("registration_done_at", cutoff);
  if (error) throw error;
}

export async function fetchKanbanHistory(customerId: string): Promise<RegStageHistoryEntry[]> {
  const { data, error } = await supabase
    .from("registration_kanban_history")
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
    missingDoc: row.missing_doc ?? undefined,
    issue: row.issue ?? undefined,
  }));
}
