import { supabase } from "./supabase";
import { setMaterials as setSharedMaterials } from "@/data/dispatchMaterialsStore";
import type { MaterialItem } from "@/data/dispatchKanbanStore";
import { fetchCustomersByIds, isGujaratSchemeCustomer } from "./customerService";

export type StageStatus = "not_started" | "in_progress" | "success";

export type AssignmentRow = {
  wireman:       string;
  wiremanId:     string;
  fabricator:    string;
  fabricatorId:  string;
  assignedAt:    number;
  workStartDate: string;
  stageDueDates: Record<number, string>;
};

export type StageStatusInfo = {
  status:      StageStatus;
  startedAt?:  string;
  completedAt?: string;
};

export type PccStatusInfo = {
  pccStageIndex:  number;
  stageEnteredAt: string;
  notes?:         string;
};

export type PccHistoryEntry = {
  fromStage: string;
  toStage:   string;
  movedAt:   string;
  date?:     string;
  notes?:    string;
};

// ── Customers ──────────────────────────────────────────────────────────────

// Returns a valid YYYY-MM-DD string or null — guards against "—" and other non-date values
function toDateOrNull(val: string | null | undefined): string | null {
  if (!val) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(val.trim()) ? val.trim() : null;
}

// Insert/update a single customer row — called immediately on "Get On Floor"
export async function upsertInstallationCustomer(
  customerId:   string,
  customerName: string,
  phone:        string,
  city:         string,
  capacity:     string,
  since:        string,
): Promise<void> {
  const { error } = await supabase
    .from("installation_customers")
    .upsert(
      { customer_id: customerId, customer_name: customerName, phone, city, capacity, since: toDateOrNull(since) },
      { onConflict: "customer_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

// Backfill: any customer already in dispatch_kanban_cards but missing from
// installation_customers gets inserted now. Runs once on installations page load.
async function syncInstallationCustomersFromDispatch(): Promise<void> {
  const [{ data: dispatchRows }, { data: installRows }] = await Promise.all([
    supabase.from("dispatch_kanban_cards").select("customer_id"),
    supabase.from("installation_customers").select("customer_id"),
  ]);

  const inInstall = new Set((installRows ?? []).map((r: { customer_id: string }) => r.customer_id));
  const missing   = (dispatchRows ?? [])
    .map((r: { customer_id: string }) => r.customer_id)
    .filter((id: string) => !inInstall.has(id));

  if (missing.length === 0) return;

  const customersRaw = await fetchCustomersByIds(missing);
  const customers = customersRaw.filter((c) => !isGujaratSchemeCustomer(c));
  if (customers.length === 0) return;

  const { error } = await supabase
    .from("installation_customers")
    .upsert(
      customers.map((c) => ({
        customer_id:   c.customerId,
        customer_name: c.name,
        phone:         c.phone,
        city:          c.city,
        capacity:      c.capacity,
        since:         toDateOrNull(c.since),
      })),
      { onConflict: "customer_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function fetchInstallationCustomers(): Promise<import("@/data/installationKanbanStore").InstallationCard[]> {
  const { data, error } = await supabase
    .from("installation_customers")
    .select("customer_id, customer_name, phone, city, capacity, since")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];

  // Pulls the same source/finance/paid/panel/inverter/PDC fields every other Kanban
  // card shows, so PCC/Work in Progress cards render identically to the rest.
  const fullCustomers = await fetchCustomersByIds(rows.map((r) => r.customer_id));
  const byId = new Map(fullCustomers.map((c) => [c.customerId, c]));

  return rows.map((row) => {
    const full = byId.get(row.customer_id);
    return {
      customerId:   row.customer_id,
      customerName: row.customer_name,
      phone:        row.phone        ?? "",
      city:         row.city         ?? "",
      capacity:     row.capacity     ?? "",
      since:        row.since        ?? "",
      source:           full?.source,
      finance:          full?.finance,
      paid:             full?.paid,
      panelBrand:       full?.panelBrand,
      wp:               full?.wp,
      numPanels:        full?.numPanels,
      inverterBrand:    full?.inverterBrand,
      inverterKw:       full?.inverterKw,
      pdcFacilityGiven: full?.pdcFacilityGiven,
    };
  });
}

// ── Assignments ────────────────────────────────────────────────────────────
export async function upsertAssignment(
  customerId:    string,
  wireman:       string,
  wiremanId:     string,
  fabricator:    string,
  fabricatorId:  string,
  assignedAt:    number,
  workStartDate: string,
  stageDueDates: Record<number, string>,
): Promise<void> {
  const { error } = await supabase
    .from("installation_assignments")
    .upsert(
      {
        customer_id:     customerId,
        wireman:         wireman      || null,
        wireman_id:      wiremanId    || null,
        fabricator:      fabricator   || null,
        fabricator_id:   fabricatorId || null,
        assigned_at:     new Date(assignedAt).toISOString(),
        work_start_date: workStartDate || null,
        stage_due_dates: stageDueDates,
      },
      { onConflict: "customer_id" },
    );
  if (error) throw error;
}

export async function fetchAssignments(customerIds: string[]): Promise<Record<string, AssignmentRow>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("installation_assignments")
    .select(
      "customer_id, wireman, wireman_id, fabricator, fabricator_id, assigned_at, work_start_date, stage_due_dates",
    )
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, AssignmentRow> = {};
  for (const row of data ?? []) {
    result[row.customer_id] = {
      wireman:       row.wireman       ?? "",
      wiremanId:     row.wireman_id    ?? "",
      fabricator:    row.fabricator    ?? "",
      fabricatorId:  row.fabricator_id ?? "",
      assignedAt:    new Date(row.assigned_at).getTime(),
      workStartDate: row.work_start_date ?? "",
      stageDueDates: (row.stage_due_dates ?? {}) as Record<number, string>,
    };
  }
  return result;
}

// ── Work Start ─────────────────────────────────────────────────────────────
export async function upsertWorkStart(
  customerId:   string,
  status:       StageStatus,
  startedAt?:   number,
  completedAt?: number,
): Promise<void> {
  const { error } = await supabase
    .from("installation_work_start")
    .upsert(
      {
        customer_id:  customerId,
        status,
        started_at:   startedAt   ? new Date(startedAt).toISOString()   : null,
        completed_at: completedAt ? new Date(completedAt).toISOString() : null,
      },
      { onConflict: "customer_id" },
    );
  if (error) throw error;
}

export async function fetchWorkStartStatuses(customerIds: string[]): Promise<Record<string, StageStatus>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("installation_work_start")
    .select("customer_id, status")
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, StageStatus> = {};
  for (const row of data ?? []) result[row.customer_id] = row.status as StageStatus;
  return result;
}

// ── Stage Statuses ─────────────────────────────────────────────────────────
export async function upsertStageStatus(
  customerId:        string,
  stageIndex:        number,
  stageName:         string,
  status:            StageStatus,
  startedAt?:        number,
  completedAt?:      number,
  completionDate?:   string,
  completionRemark?: string,
): Promise<void> {
  const { error } = await supabase
    .from("installation_stage_statuses")
    .upsert(
      {
        customer_id:       customerId,
        stage_index:       stageIndex,
        stage_name:        stageName,
        status,
        started_at:        startedAt        ? new Date(startedAt).toISOString()   : null,
        completed_at:      completedAt      ? new Date(completedAt).toISOString() : null,
        completion_date:   completionDate   ?? null,
        completion_remark: completionRemark ?? null,
      },
      { onConflict: "customer_id, stage_index" },
    );
  if (error) throw error;
}

export async function fetchStageStatuses(customerIds: string[]): Promise<Record<string, Record<number, StageStatusInfo>>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("installation_stage_statuses")
    .select("customer_id, stage_index, status, started_at, completed_at")
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, Record<number, StageStatusInfo>> = {};
  for (const row of data ?? []) {
    if (!result[row.customer_id]) result[row.customer_id] = {};
    result[row.customer_id][row.stage_index] = {
      status:      row.status as StageStatus,
      startedAt:   row.started_at   ?? undefined,
      completedAt: row.completed_at ?? undefined,
    };
  }
  return result;
}

// ── Materials ──────────────────────────────────────────────────────────────
export async function replaceCustomerMaterials(customerId: string, items: MaterialItem[]): Promise<void> {
  const { error: delErr } = await supabase
    .from("installation_materials")
    .delete()
    .eq("customer_id", customerId);
  if (delErr) throw delErr;

  if (items.length === 0) return;

  const { error: insErr } = await supabase
    .from("installation_materials")
    .insert(
      items.map((item) => ({
        customer_id:          customerId,
        item_name:            item.name,
        required_qty:         item.requiredQty,
        to_be_dispatched_qty: item.toBeDispatchedQty ?? 0,
        dispatched_qty:       item.dispatchedQty,
      })),
    );
  if (insErr) throw insErr;
}

export async function fetchAllMaterials(customerIds: string[]): Promise<Record<string, MaterialItem[]>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("installation_materials")
    .select("customer_id, item_name, required_qty, to_be_dispatched_qty, dispatched_qty")
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, MaterialItem[]> = {};
  for (const row of data ?? []) {
    if (!result[row.customer_id]) result[row.customer_id] = [];
    result[row.customer_id].push({
      id:                crypto.randomUUID(),
      name:              row.item_name,
      requiredQty:       row.required_qty,
      toBeDispatchedQty: row.to_be_dispatched_qty,
      dispatchedQty:     row.dispatched_qty,
    });
  }
  return result;
}

// ── PCC Status ─────────────────────────────────────────────────────────────
export async function upsertPccStatus(
  customerId:     string,
  pccStageIndex:  number,
  pccStageName:   string,
  stageEnteredAt: string,
  notes?:         string,
): Promise<void> {
  const { error } = await supabase
    .from("installation_pcc_status")
    .upsert(
      {
        customer_id:      customerId,
        pcc_stage_index:  pccStageIndex,
        pcc_stage_name:   pccStageName,
        stage_entered_at: stageEnteredAt,
        notes:            notes ?? null,
      },
      { onConflict: "customer_id" },
    );
  if (error) throw error;
}

export async function fetchPccStatuses(customerIds: string[]): Promise<Record<string, PccStatusInfo>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("installation_pcc_status")
    .select("customer_id, pcc_stage_index, stage_entered_at, notes")
    .in("customer_id", customerIds);
  if (error) throw error;
  const result: Record<string, PccStatusInfo> = {};
  for (const row of data ?? []) {
    result[row.customer_id] = {
      pccStageIndex:  row.pcc_stage_index,
      stageEnteredAt: row.stage_entered_at,
      notes:          row.notes ?? undefined,
    };
  }
  return result;
}

// ── PCC History ────────────────────────────────────────────────────────────
export async function insertPccHistoryEntry(
  customerId: string,
  entry:      PccHistoryEntry,
): Promise<void> {
  const { error } = await supabase.from("installation_pcc_history").insert({
    customer_id: customerId,
    from_stage:  entry.fromStage,
    to_stage:    entry.toStage,
    moved_at:    entry.movedAt,
    move_date:   entry.date  ?? null,
    notes:       entry.notes ?? null,
  });
  if (error) throw error;
}

export async function fetchPccHistories(customerIds: string[]): Promise<Record<string, PccHistoryEntry[]>> {
  if (customerIds.length === 0) return {};
  const { data, error } = await supabase
    .from("installation_pcc_history")
    .select("customer_id, from_stage, to_stage, moved_at, move_date, notes")
    .in("customer_id", customerIds)
    .order("moved_at", { ascending: true });
  if (error) throw error;
  const result: Record<string, PccHistoryEntry[]> = {};
  for (const row of data ?? []) {
    if (!result[row.customer_id]) result[row.customer_id] = [];
    result[row.customer_id].push({
      fromStage: row.from_stage,
      toStage:   row.to_stage,
      movedAt:   row.moved_at,
      date:      row.move_date ?? undefined,
      notes:     row.notes     ?? undefined,
    });
  }
  return result;
}

// ── Bulk load helper (called once on page mount) ───────────────────────────
export async function loadAllInstallationData() {
  // Ensure any dispatch customers not yet in installation_customers are synced in
  await syncInstallationCustomersFromDispatch();

  const customers = await fetchInstallationCustomers();
  const ids = customers.map((c) => c.customerId);

  const [assignmentsData, workStartData, stageStatusesData, materialsData, pccStatusData, pccHistData] =
    await Promise.all([
      fetchAssignments(ids),
      fetchWorkStartStatuses(ids),
      fetchStageStatuses(ids),
      fetchAllMaterials(ids),
      fetchPccStatuses(ids),
      fetchPccHistories(ids),
    ]);

  // Hydrate the shared dispatch-materials store so material progress bars render correctly
  for (const [cid, items] of Object.entries(materialsData)) {
    setSharedMaterials(cid, items);
  }

  return { customers, assignmentsData, workStartData, stageStatusesData, materialsData, pccStatusData, pccHistData };
}
