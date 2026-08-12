import { supabase } from "./supabase";

export type WaitingFloorEntry = {
  customerId:    string;
  enteredAt:     string;
  status:        "waiting" | "dispatched";
  dispatchedAt?: string;
};

function fromDB(row: Record<string, unknown>): WaitingFloorEntry {
  return {
    customerId:   row.customer_id    as string,
    enteredAt:    row.entered_at     as string,
    status:       (row.status        as "waiting" | "dispatched") ?? "waiting",
    dispatchedAt: (row.dispatched_at as string | undefined) ?? undefined,
  };
}

export async function fetchWaitingFloorEntries(): Promise<Record<string, WaitingFloorEntry>> {
  const { data, error } = await supabase
    .from("waiting_floor_entries")
    .select("customer_id, entered_at, status, dispatched_at");
  console.log("[WaitingFloor] fetchEntries →", { data, error });
  if (error) throw error;
  const result: Record<string, WaitingFloorEntry> = {};
  for (const row of data ?? []) result[row.customer_id] = fromDB(row);
  return result;
}

// Inserts a new entry when the customer first qualifies — no-op if already present.
export async function addToWaitingFloor(customerId: string): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("waiting_floor_entries")
    .upsert(
      { customer_id: customerId, entered_at: now, status: "waiting" },
      { onConflict: "customer_id", ignoreDuplicates: true },
    )
    .select("entered_at")
    .single();
  if (error && error.code !== "23505") throw error;
  return (data as { entered_at: string } | null)?.entered_at ?? now;
}

// Bulk upsert — inserts all new entries in a single query, ignores existing rows.
export async function bulkAddToWaitingFloor(customerIds: string[]): Promise<void> {
  if (customerIds.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("waiting_floor_entries")
    .upsert(
      customerIds.map(id => ({ customer_id: id, entered_at: now, status: "waiting" })),
      { onConflict: "customer_id", ignoreDuplicates: true },
    );
  if (error && error.code !== "23505") throw error;
}

export async function fetchEnteredAt(customerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("waiting_floor_entries")
    .select("entered_at")
    .eq("customer_id", customerId)
    .single();
  if (error) return null;
  return (data as { entered_at: string }).entered_at;
}

export async function markDispatched(customerId: string): Promise<void> {
  const { error } = await supabase
    .from("waiting_floor_entries")
    .update({ status: "dispatched", dispatched_at: new Date().toISOString() })
    .eq("customer_id", customerId);
  if (error) throw error;
}

// Reverses markDispatched — sends a customer back to the Waiting Floor.
export async function unmarkDispatched(customerId: string): Promise<void> {
  const { error } = await supabase
    .from("waiting_floor_entries")
    .update({ status: "waiting", dispatched_at: null })
    .eq("customer_id", customerId);
  if (error) throw error;
}
