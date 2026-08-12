import type { Customer } from "./customersStore";

export const DOC_VERIFICATION_STAGES = ["Document Verification"] as const;

// Tabs within the Document Verification page — each behaves like its own mini
// pipeline (same pattern as the Bajaj/Solfin/Jan Samarth tabs on the Finance page).
export const DOC_VERIFICATION_TABS = [
  "Pending Verification",
  "Resolving Issues",
  "Pending Document",
  "Name Change",
  "Name Correction",
  "Vendor Change",
  "Other Issues",
] as const;

export type DocVerificationTab = (typeof DOC_VERIFICATION_TABS)[number];

// Tabs that aren't one of the 4 checkable categories — they're aggregate views.
type AggregateTab = "Pending Verification" | "Resolving Issues";

// The 4 checkable categories — every tab except the aggregate views.
export const DOC_VERIFICATION_CHECK_TABS = DOC_VERIFICATION_TABS.filter(
  (t): t is Exclude<DocVerificationTab, AggregateTab> =>
    t !== "Pending Verification" && t !== "Resolving Issues",
);

// Each category flag is true when that issue is flagged as present on the
// customer (staff select the issues that apply, not the ones that are fine) —
// false/unset means that category has no issue.
export type DocVerificationChecklist = {
  customerId: string;
  pendingDocument: boolean;
  nameChange: boolean;
  nameCorrection: boolean;
  vendorChange: boolean;
  otherIssues: boolean;
  // Free-text description of which document is pending — captured when the
  // flag is set, and shown in place of the generic "Pending Document" label
  // everywhere that badge appears (same pattern as otherIssuesNote below).
  pendingDocumentNote?: string;
  // Free-text description of what the "Other Issues" flag actually is —
  // captured when the issue is flagged, and shown in place of the generic
  // "Other Issues" label everywhere that badge appears.
  otherIssuesNote?: string;
  submitted: boolean;
  // Only set once an "All Good" confirmation finds every category verified —
  // this is what actually moves the customer out of Document Verification and
  // into Registration. Toggling checkboxes alone never sets this, so a row
  // stays put (and visible) until the user explicitly confirms.
  cleared: boolean;
  // When `cleared` was set — the row keeps showing in Resolving Issues for
  // DOC_VERIFICATION_CLEARED_TTL_MS after this so staff can see what got
  // resolved, same as the 24h "done" grace window used on the other pipelines.
  clearedAt?: string;
  updatedAt: string;
};

export const DOC_VERIFICATION_CLEARED_TTL_MS = 24 * 60 * 60 * 1000;

export function isClearedRecently(checklist: DocVerificationChecklist): boolean {
  if (!checklist.cleared || !checklist.clearedAt) return false;
  return Date.now() - new Date(checklist.clearedAt).getTime() < DOC_VERIFICATION_CLEARED_TTL_MS;
}

export type ChecklistField = keyof Omit<
  DocVerificationChecklist,
  | "customerId"
  | "submitted"
  | "cleared"
  | "clearedAt"
  | "pendingDocumentNote"
  | "otherIssuesNote"
  | "updatedAt"
>;

// Maps each checkable tab to its field on the checklist row.
export const TAB_FIELD: Record<Exclude<DocVerificationTab, AggregateTab>, ChecklistField> = {
  "Pending Document": "pendingDocument",
  "Name Change": "nameChange",
  "Name Correction": "nameCorrection",
  "Vendor Change": "vendorChange",
  "Other Issues": "otherIssues",
};

// True when no category has an issue flagged — i.e. nothing left to resolve.
export function isFullyVerified(checklist: DocVerificationChecklist): boolean {
  return DOC_VERIFICATION_CHECK_TABS.every((t) => !checklist[TAB_FIELD[t]]);
}

// Each of the 4 category tabs is its own small kanban — same pattern as the
// Bajaj/Solfin/Jan Samarth per-provider stages on the Finance page. Moving a
// card into the last stage ("All Good") marks that category verified on the
// customer's checklist automatically.
const STANDARD_CATEGORY_STAGES = ["Pending", "In Progress", "Resolved"];

export const CATEGORY_STAGES: Record<Exclude<DocVerificationTab, AggregateTab>, string[]> = {
  "Pending Document": STANDARD_CATEGORY_STAGES,
  "Name Change": STANDARD_CATEGORY_STAGES,
  "Name Correction": STANDARD_CATEGORY_STAGES,
  "Vendor Change": STANDARD_CATEGORY_STAGES,
  "Other Issues": STANDARD_CATEGORY_STAGES,
};

export type CategoryKanbanState = {
  stageIndex: number;
  stageEnteredAt: string;
  // The name/vendor value captured on the move into "In Progress" — kept on
  // the category's kanban state (not just in its move history) so the later
  // move into the final stage can apply it without asking again.
  valueName?: string;
};

export type CategoryKanbanCard = DocVerificationCard & {
  stageIndex: number;
  valueName?: string;
};

// Categories that collect an extra named value on move ("Name Change" asks
// for the new name, "Vendor Change" asks for the new vendor). Others
// ("Pending Document", "Other Issues") just take a remark + follow-up date.
export const CATEGORY_VALUE_FIELD_LABEL: Partial<
  Record<Exclude<DocVerificationTab, AggregateTab>, string>
> = {
  "Name Change": "Name",
  "Name Correction": "Corrected Name",
  "Vendor Change": "Vendor Name",
};

export type CategoryStagePayload = {
  notes?: string;
  followDate?: string;
  valueName?: string;
};

export type CategoryStageHistoryEntry = {
  fromStageIdx: number;
  toStageIdx: number;
  fromStageName: string;
  toStageName: string;
  movedAt: string;
  movedByName?: string;
} & CategoryStagePayload;

export type DocVerificationCard = {
  customerId: string;
  customerName: string;
  phone: string;
  city: string;
  capacity: string;
  stageEnteredAt: string;
  source?: string;
  paid?: string;
  finance?: string;
  panelBrand?: string;
  wp?: string;
  numPanels?: string;
  inverterKw?: string;
  inverterBrand?: string;
  pdcFacilityGiven?: "Yes" | "No";
};

export function emptyChecklist(customerId: string): DocVerificationChecklist {
  return {
    customerId,
    pendingDocument: false,
    nameChange: false,
    nameCorrection: false,
    vendorChange: false,
    otherIssues: false,
    submitted: false,
    cleared: false,
    updatedAt: new Date().toISOString(),
  };
}

export function buildDocVerificationCards(customers: Customer[]): DocVerificationCard[] {
  return customers.map((c) => ({
    customerId: c.customerId,
    customerName: c.name,
    phone: c.phone,
    city: c.city,
    capacity: c.capacity,
    stageEnteredAt: (c.since || new Date().toISOString().slice(0, 10)) + "T00:00:00",
    source: c.source,
    paid: c.paid,
    finance: c.finance,
    panelBrand: c.panelBrand,
    wp: c.wp,
    numPanels: c.numPanels,
    inverterKw: c.inverterKw,
    inverterBrand: c.inverterBrand,
    pdcFacilityGiven: c.pdcFacilityGiven,
  }));
}

export function buildCategoryCards(
  cards: DocVerificationCard[],
  states: Record<string, CategoryKanbanState>,
): CategoryKanbanCard[] {
  return cards.map((c) => {
    const state = states[c.customerId];
    return {
      ...c,
      stageIndex: state?.stageIndex ?? 0,
      stageEnteredAt: state?.stageEnteredAt ?? c.stageEnteredAt,
      valueName: state?.valueName,
    };
  });
}
