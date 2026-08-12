import { supabase } from "./supabase";
import { DISPATCH_DONE_STAGE_IDX, DISPATCH_DONE_TTL_MS } from "@/data/dispatchKanbanStore";
import type { DispatchStageHistoryEntry, MaterialItem } from "@/data/dispatchKanbanStore";

export type KanbanState = {
  stageIndex: number;
  stageEnteredAt: string;
  notes?: string;
  date?: string;
  plannedDispatchDate?: string;
  driverName?: string;
  challanNo?: string;
  materials?: MaterialItem[];
};

const DISPATCH_CARD_COLS =
  "customer_id, stage_index, stage_entered_at, notes, date, planned_dispatch_date, driver_name, challan_no, materials";

function rowToState(row: Record<string, unknown>): KanbanState {
  return {
    stageIndex: row.stage_index as number,
    stageEnteredAt: row.stage_entered_at as string,
    notes: (row.notes as string | null) ?? undefined,
    date: (row.date as string | null) ?? undefined,
    plannedDispatchDate: (row.planned_dispatch_date as string | null) ?? undefined,
    driverName: (row.driver_name as string | null) ?? undefined,
    challanNo: (row.challan_no as string | null) ?? undefined,
    materials: Array.isArray(row.materials) ? (row.materials as MaterialItem[]) : undefined,
  };
}

export async function fetchAllDispatchStates(
  customerIds: string[],
): Promise<Record<string, KanbanState>> {
  const { data, error } = await supabase
    .from("dispatch_kanban_cards")
    .select(DISPATCH_CARD_COLS)
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, KanbanState> = {};
  for (const row of data ?? []) result[row.customer_id] = rowToState(row);
  return result;
}

// Fetch every dispatch card (no ID filter) — used to populate the kanban on load.
export async function fetchAllDispatchCards(): Promise<Record<string, KanbanState>> {
  const { data, error } = await supabase.from("dispatch_kanban_cards").select(DISPATCH_CARD_COLS);
  if (error) throw error;
  const result: Record<string, KanbanState> = {};
  for (const row of data ?? []) result[row.customer_id] = rowToState(row);
  return result;
}

// Insert stage-0 row only if no row exists yet — never overwrites existing progress.
export async function insertDispatchCardIfAbsent(
  customerId: string,
  stageEnteredAt: string,
): Promise<void> {
  const { error } = await supabase
    .from("dispatch_kanban_cards")
    .insert({ customer_id: customerId, stage_index: 0, stage_entered_at: stageEnteredAt })
    .select();
  if (error && error.code !== "23505") throw error;
}

export async function upsertDispatchState(
  customerId: string,
  stageIndex: number,
  stageEnteredAt: string,
  notes?: string,
  date?: string,
  plannedDispatchDate?: string,
  driverName?: string,
  challanNo?: string,
  materials?: MaterialItem[],
): Promise<void> {
  const { error } = await supabase.from("dispatch_kanban_cards").upsert(
    {
      customer_id: customerId,
      stage_index: stageIndex,
      stage_entered_at: stageEnteredAt,
      notes: notes ?? null,
      date: date ?? null,
      planned_dispatch_date: plannedDispatchDate ?? null,
      driver_name: driverName ?? null,
      challan_no: challanNo ?? null,
      materials: materials?.length ? materials : null,
    },
    { onConflict: "customer_id" },
  );
  if (error) throw error;
}

// Removes a customer's dispatch card entirely — used to revert a customer from
// "Pending Planning" back to the Waiting Floor. History is untouched.
export async function deleteDispatchCard(customerId: string): Promise<void> {
  const { error } = await supabase
    .from("dispatch_kanban_cards")
    .delete()
    .eq("customer_id", customerId);
  if (error) throw error;
}

// Prunes dispatch_kanban_cards rows that have sat in "Dispatched Today" for over 24h.
// Runs lazily on Dispatch page mount (no server/cron in this app). History is untouched.
export async function deleteExpiredDispatchDoneCards(): Promise<void> {
  const cutoff = new Date(Date.now() - DISPATCH_DONE_TTL_MS).toISOString();
  const { error } = await supabase
    .from("dispatch_kanban_cards")
    .delete()
    .eq("stage_index", DISPATCH_DONE_STAGE_IDX)
    .lt("stage_entered_at", cutoff);
  if (error) throw error;
}

export async function insertDispatchHistory(
  customerId: string,
  entry: DispatchStageHistoryEntry,
): Promise<void> {
  const { error } = await supabase.from("dispatch_kanban_history").insert({
    customer_id: customerId,
    from_stage_idx: entry.fromStageIdx,
    to_stage_idx: entry.toStageIdx,
    from_stage_name: entry.fromStageName,
    to_stage_name: entry.toStageName,
    moved_at: entry.movedAt,
    moved_by_name: entry.movedByName ?? null,
    notes: entry.notes ?? null,
    date: entry.date ?? null,
    planned_dispatch_date: entry.plannedDispatchDate ?? null,
    driver_name: entry.driverName ?? null,
    challan_no: entry.challanNo ?? null,
    materials: entry.materials?.length ? entry.materials : null,
  });
  if (error) throw error;
}

export async function fetchDispatchHistory(
  customerId: string,
): Promise<DispatchStageHistoryEntry[]> {
  const { data, error } = await supabase
    .from("dispatch_kanban_history")
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
    plannedDispatchDate: row.planned_dispatch_date ?? undefined,
    driverName: row.driver_name ?? undefined,
    challanNo: row.challan_no ?? undefined,
    materials: Array.isArray(row.materials) ? row.materials : undefined,
  }));
}
