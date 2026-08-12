import { supabase } from "@/lib/supabase";
import {
  PAYMENT_STAGES,
  PAYMENT_DONE_STAGE_IDX,
  PAYMENT_DONE_TTL_MS,
  type PaymentCard,
  type PaymentMode,
  type PaymentCategory,
  type PaymentStagePayload,
  type PaymentHistoryEntry,
} from "@/data/paymentKanbanStore";

// ── DB row shapes ──────────────────────────────────────────────────────────

type CardRow = {
  id: number;
  customer_id: string;
  customer_name: string;
  phone: string | null;
  city: string | null;
  capacity: string | null;
  amount: string;
  mode: PaymentMode;
  category: PaymentCategory | null;
  stage_index: number;
  stage_entered_at: string;
  notes: string | null;
  stage_date: string | null;
  payment_collected: string | null;
  created_at: string;
  cheque_no: string | null;
  cheque_date: string | null;
  bank_name: string | null;
  branch: string | null;
  // Only present once payment_archived_schema.sql has been applied — absent
  // (undefined) rows must be treated as not archived, not as an error.
  archived_at?: string | null;
};

type HistoryRow = {
  id: string;
  card_id: number;
  from_stage_idx: number;
  to_stage_idx: number;
  from_stage_name: string;
  to_stage_name: string;
  moved_at: string;
  moved_by_name: string | null;
  notes: string | null;
  stage_date: string | null;
  payment_collected: string | null;
};

// ── DB ↔ domain mappers ────────────────────────────────────────────────────

export const normalizeId = (s: string) => s.replace(/^(ASPL-?)0*(\d+)$/i, "ASPL-$2");

function cardFromDB(row: CardRow): PaymentCard {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    phone: row.phone ?? "",
    city: row.city ?? "",
    capacity: row.capacity ?? "",
    amount: row.amount,
    mode: row.mode,
    category: row.category ?? "SELF",
    stageIndex: row.stage_index,
    stageEnteredAt: row.stage_entered_at,
    notes: row.notes ?? "",
    stageDate: row.stage_date ?? undefined,
    paymentCollected: row.payment_collected ?? undefined,
    createdAt: row.created_at,
    chequeNo: row.cheque_no ?? undefined,
    chequeDate: row.cheque_date ?? undefined,
    bankName: row.bank_name ?? undefined,
    branch: row.branch ?? undefined,
  };
}

function cardToDB(card: Omit<PaymentCard, "id">) {
  return {
    customer_id: normalizeId(card.customerId),
    customer_name: card.customerName,
    phone: card.phone || null,
    city: card.city || null,
    capacity: card.capacity || null,
    amount: card.amount,
    mode: card.mode,
    category: card.category,
    stage_index: card.stageIndex,
    stage_entered_at: card.stageEnteredAt,
    notes: card.notes || null,
    stage_date: card.stageDate ?? null,
    payment_collected: card.paymentCollected ?? null,
    created_at: card.createdAt,
    cheque_no: card.chequeNo ?? null,
    cheque_date: card.chequeDate ?? null,
    bank_name: card.bankName ?? null,
    branch: card.branch ?? null,
  };
}

function historyFromDB(row: HistoryRow): PaymentHistoryEntry {
  return {
    fromStageIdx: row.from_stage_idx,
    toStageIdx: row.to_stage_idx,
    fromStageName: row.from_stage_name,
    toStageName: row.to_stage_name,
    movedAt: row.moved_at,
    movedByName: row.moved_by_name ?? undefined,
    notes: row.notes ?? undefined,
    stageDate: row.stage_date ?? undefined,
    paymentCollected: row.payment_collected ?? undefined,
  };
}

function parseAmount(amount: string): number {
  return Number(amount.replace(/[^0-9.]/g, "")) || 0;
}

function formatAmount(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

// ── Fetch ──────────────────────────────────────────────────────────────────

// Board-facing fetch — excludes cards archived 24h after reaching "Payment
// Credited" (see archiveExpiredPaymentDoneCards). Use fetchAllPaymentCardsRaw
// instead for anything that needs to count credited payments regardless of
// how long ago they were credited (e.g. paid totals/gating).
//
// Filters archived_at in JS rather than in the query itself — a WHERE clause
// referencing a column that doesn't exist yet (payment_archived_schema.sql
// not applied) fails the whole query, hiding every payment on the board. A
// row simply missing the column reads as archived_at: undefined here, which
// filters the same as "not archived".
export async function fetchPaymentCards(): Promise<PaymentCard[]> {
  const { data, error } = await supabase
    .from("payment_kanban_cards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CardRow[]).filter((row) => !row.archived_at).map(cardFromDB);
}

// Unfiltered fetch (includes archived cards) — only for totals/gating logic
// that must keep counting a payment after it drops off the visible board.
async function fetchAllPaymentCardsRaw(): Promise<PaymentCard[]> {
  const { data, error } = await supabase
    .from("payment_kanban_cards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CardRow[]).map(cardFromDB);
}

export async function fetchPaymentCardsByCustomer(customerId: string): Promise<PaymentCard[]> {
  const { data, error } = await supabase
    .from("payment_kanban_cards")
    .select("*")
    .eq("customer_id", normalizeId(customerId))
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CardRow[]).map(cardFromDB);
}

export async function fetchPaymentHistory(cardId: number): Promise<PaymentHistoryEntry[]> {
  const { data, error } = await supabase
    .from("payment_kanban_history")
    .select("*")
    .eq("card_id", cardId)
    .order("moved_at", { ascending: true });
  if (error) throw error;
  return (data as HistoryRow[]).map(historyFromDB);
}

export async function fetchAllPaymentHistory(
  cardIds: number[],
): Promise<Record<number, PaymentHistoryEntry[]>> {
  if (cardIds.length === 0) return {};
  const { data, error } = await supabase
    .from("payment_kanban_history")
    .select("*")
    .in("card_id", cardIds)
    .order("moved_at", { ascending: true });
  if (error) throw error;
  const result: Record<number, PaymentHistoryEntry[]> = {};
  for (const row of data as HistoryRow[]) {
    if (!result[row.card_id]) result[row.card_id] = [];
    result[row.card_id].push(historyFromDB(row));
  }
  return result;
}

// ── Mutations ──────────────────────────────────────────────────────────────

export async function addPaymentCard(card: Omit<PaymentCard, "id">): Promise<PaymentCard> {
  const { data, error } = await supabase
    .from("payment_kanban_cards")
    .insert(cardToDB(card))
    .select()
    .single();
  if (error) throw error;
  return cardFromDB(data as CardRow);
}

// Moves `card` forward by `movedAmount`. If movedAmount is less than the card's
// current amount, the difference stays as a brand-new card in the FROM stage
// while the original card carries the moved amount into the TO stage.
export async function movePaymentCard(
  card: PaymentCard,
  toStageIdx: number,
  toStageName: string,
  movedAmount: number,
  payload?: PaymentStagePayload,
  movedByName?: string,
): Promise<void> {
  const fromStageIdx = card.stageIndex;
  const fromStageName = PAYMENT_STAGES[card.mode]?.[fromStageIdx] ?? "—";

  // A rejected cheque only ever goes back to "Payment Received" for a redo — it can
  // never be credited directly, since the money never actually cleared.
  if (fromStageName === "Payment Rejected" && toStageName !== "Payment Received") {
    throw new Error('A rejected payment can only be moved back to "Payment Received".');
  }

  const movedAt = new Date().toISOString();
  const originalAmt = parseAmount(card.amount);
  const clampedMoved = Math.min(Math.max(movedAmount, 0), originalAmt);
  const remainder = originalAmt - clampedMoved;
  const paymentCollected = payload?.paymentCollected ?? formatAmount(clampedMoved);

  const { error: updateErr } = await supabase
    .from("payment_kanban_cards")
    .update({
      stage_index: toStageIdx,
      stage_entered_at: movedAt,
      amount: formatAmount(clampedMoved),
      notes: payload?.notes ?? card.notes ?? null,
      stage_date: payload?.stageDate ?? null,
      payment_collected: paymentCollected,
    })
    .eq("id", card.id);
  if (updateErr) throw updateErr;

  const { error: histErr } = await supabase.from("payment_kanban_history").insert({
    card_id: card.id,
    from_stage_idx: fromStageIdx,
    to_stage_idx: toStageIdx,
    from_stage_name: fromStageName,
    to_stage_name: toStageName,
    moved_at: movedAt,
    moved_by_name: movedByName ?? null,
    notes: payload?.notes ?? null,
    stage_date: payload?.stageDate ?? null,
    payment_collected: paymentCollected,
  });
  if (histErr) throw histErr;

  if (remainder > 0) {
    await addPaymentCard({
      customerId: card.customerId,
      customerName: card.customerName,
      phone: card.phone,
      city: card.city,
      capacity: card.capacity,
      amount: formatAmount(remainder),
      mode: card.mode,
      category: card.category,
      stageIndex: fromStageIdx,
      stageEnteredAt: movedAt,
      createdAt: movedAt,
      notes: `Pending balance of ${formatAmount(remainder)} from original payment of ${card.amount}.`,
    });
  }
}

// Hides payment_kanban_cards rows that have sat in "Payment Credited" for over
// 24h, per-mode since each mode's credited stage sits at a different index.
// Runs lazily on Payment page mount (no server/cron in this app). Unlike the
// other pipelines' deleteExpiredXDoneCards, this archives (sets archived_at)
// rather than deletes — fetchCreditedTotalsByCustomer / fetchPdcCreditedCustomerIds
// must keep counting the payment even after it drops off the board.
export async function archiveExpiredPaymentDoneCards(): Promise<void> {
  const cutoff = new Date(Date.now() - PAYMENT_DONE_TTL_MS).toISOString();
  const now = new Date().toISOString();
  for (const mode of Object.keys(PAYMENT_DONE_STAGE_IDX) as PaymentMode[]) {
    const doneStageIdx = PAYMENT_DONE_STAGE_IDX[mode];
    if (doneStageIdx < 0) continue;
    const { error } = await supabase
      .from("payment_kanban_cards")
      .update({ archived_at: now })
      .eq("mode", mode)
      .eq("stage_index", doneStageIdx)
      .is("archived_at", null)
      .lt("stage_entered_at", cutoff);
    if (error) throw error;
  }
}

export async function deletePaymentCard(id: number): Promise<void> {
  const { error } = await supabase.from("payment_kanban_cards").delete().eq("id", id);
  if (error) throw error;
  // payment_kanban_history rows cascade-delete via FK
}

export async function deletePaymentCardsForCustomer(customerId: string): Promise<void> {
  const { error } = await supabase
    .from("payment_kanban_cards")
    .delete()
    .eq("customer_id", normalizeId(customerId));
  if (error) throw error;
}

// Sum of amounts currently sitting at "Payment Credited" per customer, across all
// modes — the only point at which money is actually confirmed received (a cheque
// or cash entry only counts once it clears, not the moment it's collected).
export async function fetchCreditedTotalsByCustomer(): Promise<Record<string, number>> {
  const cards = await fetchAllPaymentCardsRaw();
  const totals: Record<string, number> = {};
  for (const card of cards) {
    const stageName = PAYMENT_STAGES[card.mode]?.[card.stageIndex];
    if (stageName !== "Payment Credited") continue;
    const id = normalizeId(card.customerId);
    totals[id] = (totals[id] ?? 0) + parseAmount(card.amount);
  }
  return totals;
}

const PDC_RECEIVED_STAGE_IDX = PAYMENT_STAGES.PDC.indexOf("Payment Received");

// Customers whose PDC card has reached "Payment Received" (or any stage after
// it, short of a rejection) — drives the PDC tag's red/green color, independent
// of any other mode's credited amount.
export async function fetchPdcCreditedCustomerIds(): Promise<Set<string>> {
  const cards = await fetchAllPaymentCardsRaw();
  const ids = new Set<string>();
  for (const card of cards) {
    if (card.mode !== "PDC") continue;
    const stageName = PAYMENT_STAGES.PDC[card.stageIndex];
    if (stageName === "Payment Rejected") continue;
    if (card.stageIndex < PDC_RECEIVED_STAGE_IDX) continue;
    ids.add(normalizeId(card.customerId));
  }
  return ids;
}

// ── Timeline (sync — requires pre-fetched history) ─────────────────────────

export type PaymentTimelineEntry = {
  stageName: string;
  date: string;
  notes?: string;
  stageDate?: string;
  paymentCollected?: string;
};

export function buildPaymentTimeline(
  card: PaymentCard,
  history: PaymentHistoryEntry[],
): PaymentTimelineEntry[] {
  if (history.length === 0) {
    return [
      {
        stageName: PAYMENT_STAGES[card.mode]?.[card.stageIndex] ?? "—",
        date: card.createdAt,
        notes: card.notes,
        stageDate: card.stageDate,
        paymentCollected: card.paymentCollected ?? card.amount,
      },
    ];
  }
  const entries: PaymentTimelineEntry[] = [
    {
      stageName: history[0].fromStageName,
      date: card.createdAt,
      paymentCollected: history[0].paymentCollected ?? card.amount,
    },
  ];
  for (const h of history) {
    entries.push({
      stageName: h.toStageName,
      date: h.movedAt,
      notes: h.notes,
      stageDate: h.stageDate,
      paymentCollected: h.paymentCollected,
    });
  }
  return entries;
}
