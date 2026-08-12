import { supabase } from "./supabase";
import {
  STAGES,
  FINANCE_DONE_STAGE_IDX,
  FINANCE_DONE_TTL_MS,
  FINANCE_INSTALL_COMPLETE_STAGE_IDX,
} from "@/data/financeStore";
import type { FinanceProvider, FinanceKanbanState, StageHistoryEntry } from "@/data/financeStore";

// Prunes finance_kanban_cards rows that have sat in "Final Disbursed" for over 24h,
// per-provider since each provider's terminal stage sits at a different index. Runs
// lazily on Finance page mount (no server/cron in this app). History is untouched.
export async function deleteExpiredFinanceDoneCards(): Promise<void> {
  const cutoff = new Date(Date.now() - FINANCE_DONE_TTL_MS).toISOString();
  for (const provider of Object.keys(FINANCE_DONE_STAGE_IDX) as FinanceProvider[]) {
    const { error } = await supabase
      .from("finance_kanban_cards")
      .delete()
      .eq("provider", provider)
      .eq("stage_index", FINANCE_DONE_STAGE_IDX[provider])
      .lt("stage_entered_at", cutoff);
    if (error) throw error;
  }
}

// Inserts stage-0 rows for any customer+provider pair not yet in the DB.
// ignoreDuplicates: true → ON CONFLICT DO NOTHING, so existing progress is never overwritten.
export async function insertFinanceCardsIfAbsent(
  entries: { customerId: string; provider: FinanceProvider; stageEnteredAt: string }[],
): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await supabase.from("finance_kanban_cards").insert(
    entries.map((e) => ({
      customer_id: e.customerId,
      provider: e.provider,
      stage_index: 0,
      stage_entered_at: e.stageEnteredAt,
    })),
    { ignoreDuplicates: true },
  );
  if (error) throw error;
}

// Fetches finance states for multiple customers across ALL providers in one query.
// Returns { [customerId]: { [provider]: FinanceKanbanState } }
export async function fetchAllFinanceStatesForCustomers(
  customerIds: string[],
): Promise<Record<string, Partial<Record<FinanceProvider, FinanceKanbanState>>>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("finance_kanban_cards")
    .select(
      "customer_id, provider, stage_index, stage_entered_at, notes, stage_date, follow_date, bank, loan_amount, dp, first_disb_amt, second_disb_amt",
    )
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, Partial<Record<FinanceProvider, FinanceKanbanState>>> = {};
  for (const row of data ?? []) {
    if (!result[row.customer_id]) result[row.customer_id] = {};
    result[row.customer_id][row.provider as FinanceProvider] = {
      stageIndex: row.stage_index,
      stageEnteredAt: row.stage_entered_at,
      notes: row.notes ?? undefined,
      stageDate: row.stage_date ?? undefined,
      followDate: row.follow_date ?? undefined,
      bank: row.bank ?? undefined,
      loanAmount: row.loan_amount ?? undefined,
      dp: row.dp ?? undefined,
      firstDisbAmt: row.first_disb_amt ?? undefined,
      secondDisbAmt: row.second_disb_amt ?? undefined,
    };
  }
  return result;
}

export async function fetchFinanceStates(
  customerIds: string[],
  provider: FinanceProvider,
): Promise<Record<string, FinanceKanbanState>> {
  const { data, error } = await supabase
    .from("finance_kanban_cards")
    .select(
      "customer_id, stage_index, stage_entered_at, notes, stage_date, follow_date, bank, loan_amount, dp, first_disb_amt, second_disb_amt",
    )
    .eq("provider", provider)
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, FinanceKanbanState> = {};
  for (const row of data ?? []) {
    result[row.customer_id] = {
      stageIndex: row.stage_index,
      stageEnteredAt: row.stage_entered_at,
      notes: row.notes ?? undefined,
      stageDate: row.stage_date ?? undefined,
      followDate: row.follow_date ?? undefined,
      bank: row.bank ?? undefined,
      loanAmount: row.loan_amount ?? undefined,
      dp: row.dp ?? undefined,
      firstDisbAmt: row.first_disb_amt ?? undefined,
      secondDisbAmt: row.second_disb_amt ?? undefined,
    };
  }
  return result;
}

export async function upsertFinanceState(
  customerId: string,
  provider: FinanceProvider,
  stageIndex: number,
  stageEnteredAt: string,
  notes?: string,
  stageDate?: string,
  followDate?: string,
  bank?: string,
  loanAmount?: string,
  dp?: string,
  firstDisbAmt?: string,
  secondDisbAmt?: string,
): Promise<void> {
  const { error } = await supabase.from("finance_kanban_cards").upsert(
    {
      customer_id: customerId,
      provider,
      stage_index: stageIndex,
      stage_entered_at: stageEnteredAt,
      notes: notes ?? null,
      stage_date: stageDate ?? null,
      follow_date: followDate ?? null,
      bank: bank ?? null,
      loan_amount: loanAmount ?? null,
      dp: dp ?? null,
      first_disb_amt: firstDisbAmt ?? null,
      second_disb_amt: secondDisbAmt ?? null,
    },
    { onConflict: "customer_id,provider" },
  );
  if (error) throw error;
}

// Pushes this customer's BAJAJ finance card forward to "Installation Completed" if it
// hasn't reached it yet — called once Installations marks every "Work in Progress"
// stage (not PCC) done for them. This is the only way that stage is ever reached for
// a Bajaj-financed customer; the Finance kanban blocks it as a manual move there.
// Other providers (Solfin, Jan Samarth) are unaffected — that stage stays manual for them.
export async function advanceFinanceToInstallationCompleted(customerId: string): Promise<void> {
  const provider: FinanceProvider = "BAJAJ";
  const targetIdx = FINANCE_INSTALL_COMPLETE_STAGE_IDX[provider];

  const { data, error } = await supabase
    .from("finance_kanban_cards")
    .select("stage_index")
    .eq("customer_id", customerId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.stage_index >= targetIdx) return;

  const stageEnteredAt = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("finance_kanban_cards")
    .update({ stage_index: targetIdx, stage_entered_at: stageEnteredAt })
    .eq("customer_id", customerId)
    .eq("provider", provider);
  if (updateErr) throw updateErr;

  const { error: histErr } = await supabase.from("finance_kanban_history").insert({
    customer_id: customerId,
    provider,
    from_stage_idx: data.stage_index,
    to_stage_idx: targetIdx,
    from_stage_name: STAGES[provider][data.stage_index] ?? "—",
    to_stage_name: STAGES[provider][targetIdx],
    moved_at: stageEnteredAt,
    moved_by_name: null,
  });
  if (histErr) throw histErr;
}

// Pushes this customer's SOLFIN and/or JAN SAMARTH finance card forward to "Installation
// Completed" if it hasn't reached it yet — called once Net-Metering reaches "Net Meter
// Installed" for them. Entirely separate from advanceFinanceToInstallationCompleted above
// (different trigger page, different providers) — Bajaj is untouched by this function.
export async function advanceSolfinJanSamarthToInstallationCompleted(
  customerId: string,
): Promise<void> {
  const providers: FinanceProvider[] = ["SOLFIN", "JAN SAMARTH"];
  for (const provider of providers) {
    const targetIdx = FINANCE_INSTALL_COMPLETE_STAGE_IDX[provider];

    const { data, error } = await supabase
      .from("finance_kanban_cards")
      .select("stage_index")
      .eq("customer_id", customerId)
      .eq("provider", provider)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.stage_index >= targetIdx) continue;

    const stageEnteredAt = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("finance_kanban_cards")
      .update({ stage_index: targetIdx, stage_entered_at: stageEnteredAt })
      .eq("customer_id", customerId)
      .eq("provider", provider);
    if (updateErr) throw updateErr;

    const { error: histErr } = await supabase.from("finance_kanban_history").insert({
      customer_id: customerId,
      provider,
      from_stage_idx: data.stage_index,
      to_stage_idx: targetIdx,
      from_stage_name: STAGES[provider][data.stage_index] ?? "—",
      to_stage_name: STAGES[provider][targetIdx],
      moved_at: stageEnteredAt,
      moved_by_name: null,
    });
    if (histErr) throw histErr;
  }
}

export async function insertFinanceHistory(
  customerId: string,
  provider: FinanceProvider,
  entry: StageHistoryEntry,
): Promise<void> {
  const { error } = await supabase.from("finance_kanban_history").insert({
    customer_id: customerId,
    provider,
    from_stage_idx: entry.fromStageIdx,
    to_stage_idx: entry.toStageIdx,
    from_stage_name: entry.fromStageName,
    to_stage_name: entry.toStageName,
    moved_at: entry.movedAt,
    moved_by_name: entry.movedByName ?? null,
    notes: entry.notes ?? null,
    stage_date: entry.stageDate ?? null,
    follow_date: entry.followDate ?? null,
    bank: entry.bank ?? null,
    loan_amount: entry.loanAmount ?? null,
    dp: entry.dp ?? null,
    first_disb_amt: entry.firstDisbAmt ?? null,
    second_disb_amt: entry.secondDisbAmt ?? null,
  });
  if (error) throw error;
}

export async function fetchFinanceHistory(
  customerId: string,
  provider: FinanceProvider,
): Promise<StageHistoryEntry[]> {
  const { data, error } = await supabase
    .from("finance_kanban_history")
    .select("*")
    .eq("customer_id", customerId)
    .eq("provider", provider)
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
    bank: row.bank ?? undefined,
    loanAmount: row.loan_amount ?? undefined,
    dp: row.dp ?? undefined,
    firstDisbAmt: row.first_disb_amt ?? undefined,
    secondDisbAmt: row.second_disb_amt ?? undefined,
  }));
}
