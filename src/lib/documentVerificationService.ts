import { supabase } from "./supabase";
import type {
  DocVerificationChecklist,
  DocVerificationTab,
  CategoryKanbanState,
  CategoryStageHistoryEntry,
} from "@/data/documentVerificationStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDB(row: any): DocVerificationChecklist {
  return {
    customerId: row.customer_id,
    pendingDocument: row.pending_document ?? false,
    nameChange: row.name_change ?? false,
    nameCorrection: row.name_correction ?? false,
    vendorChange: row.vendor_change ?? false,
    otherIssues: row.other_issues ?? false,
    pendingDocumentNote: row.pending_document_note ?? undefined,
    otherIssuesNote: row.other_issues_note ?? undefined,
    submitted: row.submitted ?? false,
    cleared: row.cleared ?? false,
    clearedAt: row.cleared_at ?? undefined,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export async function fetchDocVerificationChecklists(
  customerIds: string[],
): Promise<Record<string, DocVerificationChecklist>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("document_verification_checklist")
    .select("*")
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, DocVerificationChecklist> = {};
  for (const row of data ?? []) result[row.customer_id] = fromDB(row);
  return result;
}

export async function upsertDocVerificationChecklist(
  customerId: string,
  patch: Partial<Omit<DocVerificationChecklist, "customerId" | "updatedAt">>,
): Promise<void> {
  const row: Record<string, unknown> = { customer_id: customerId };
  if (patch.pendingDocument !== undefined) row.pending_document = patch.pendingDocument;
  if (patch.nameChange !== undefined) row.name_change = patch.nameChange;
  if (patch.nameCorrection !== undefined) row.name_correction = patch.nameCorrection;
  if (patch.vendorChange !== undefined) row.vendor_change = patch.vendorChange;
  if (patch.otherIssues !== undefined) row.other_issues = patch.otherIssues;
  if (patch.pendingDocumentNote !== undefined) row.pending_document_note = patch.pendingDocumentNote;
  if (patch.otherIssuesNote !== undefined) row.other_issues_note = patch.otherIssuesNote;
  if (patch.submitted !== undefined) row.submitted = patch.submitted;
  if (patch.cleared !== undefined) row.cleared = patch.cleared;
  if (patch.clearedAt !== undefined) row.cleared_at = patch.clearedAt;
  const { error } = await supabase
    .from("document_verification_checklist")
    .upsert(row, { onConflict: "customer_id" });
  if (error) throw error;
}

export async function fetchCategoryStates(
  customerIds: string[],
  category: DocVerificationTab,
): Promise<Record<string, CategoryKanbanState>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("document_verification_category_cards")
    .select("customer_id, stage_index, stage_entered_at, value_name")
    .eq("category", category)
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, CategoryKanbanState> = {};
  for (const row of data ?? []) {
    result[row.customer_id] = {
      stageIndex: row.stage_index,
      stageEnteredAt: row.stage_entered_at,
      valueName: row.value_name ?? undefined,
    };
  }
  return result;
}

// Bulk variant of fetchCategoryStates that pulls every category's kanban
// state at once (keyed by customer, then category) — used by the Resolving
// Issues tab to tell an already-cleared category ("All Good" was reached)
// apart from one that was never flagged as an issue in the first place.
export async function fetchCategoryStatesForCustomers(
  customerIds: string[],
): Promise<Record<string, Partial<Record<DocVerificationTab, CategoryKanbanState>>>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("document_verification_category_cards")
    .select("customer_id, category, stage_index, stage_entered_at, value_name")
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, Partial<Record<DocVerificationTab, CategoryKanbanState>>> = {};
  for (const row of data ?? []) {
    const byCategory = (result[row.customer_id] ??= {});
    byCategory[row.category as DocVerificationTab] = {
      stageIndex: row.stage_index,
      stageEnteredAt: row.stage_entered_at,
      valueName: row.value_name ?? undefined,
    };
  }
  return result;
}

export async function upsertCategoryState(
  customerId: string,
  category: DocVerificationTab,
  stageIndex: number,
  stageEnteredAt: string,
  valueName?: string,
): Promise<void> {
  const row: Record<string, unknown> = {
    customer_id: customerId,
    category,
    stage_index: stageIndex,
    stage_entered_at: stageEnteredAt,
  };
  // Only set on the move that captures it — omitting the column on later
  // moves (e.g. into the final stage) leaves the previously saved value
  // untouched instead of overwriting it with null.
  if (valueName !== undefined) row.value_name = valueName;
  const { error } = await supabase
    .from("document_verification_category_cards")
    .upsert(row, { onConflict: "customer_id,category" });
  if (error) throw error;
}

export async function insertCategoryHistory(
  customerId: string,
  category: DocVerificationTab,
  entry: CategoryStageHistoryEntry,
): Promise<void> {
  const { error } = await supabase.from("document_verification_category_history").insert({
    customer_id: customerId,
    category,
    from_stage_idx: entry.fromStageIdx,
    to_stage_idx: entry.toStageIdx,
    from_stage_name: entry.fromStageName,
    to_stage_name: entry.toStageName,
    moved_at: entry.movedAt,
    moved_by_name: entry.movedByName ?? null,
    notes: entry.notes ?? null,
    follow_date: entry.followDate ?? null,
    value_name: entry.valueName ?? null,
  });
  if (error) throw error;
}

export async function fetchCategoryHistory(
  customerId: string,
  category: DocVerificationTab,
): Promise<CategoryStageHistoryEntry[]> {
  const { data, error } = await supabase
    .from("document_verification_category_history")
    .select("*")
    .eq("customer_id", customerId)
    .eq("category", category)
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
    followDate: row.follow_date ?? undefined,
    valueName: row.value_name ?? undefined,
  }));
}
