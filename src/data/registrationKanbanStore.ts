import type { Customer } from "./customersStore";

export const REG_STAGES = ["Ready to Register", "Registration Done", "Bank Upload"] as const;

export type RegKanbanCard = {
  customerId: string; // ASPL ID — primary key
  customerName: string;
  phone: string;
  city: string;
  capacity: string;
  stageIndex: number;
  stageEnteredAt: string;
  notes?: string;
  finalStageEnteredAt?: string; // set when moved to "Bank Upload"; card expires 24h after this
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

export type RegStagePayload = {
  notes?: string;
  stageDate?: string;
  followDate?: string;
  missingDoc?: string;
  issue?: string;
};

export type RegStageHistoryEntry = {
  fromStageIdx: number;
  toStageIdx: number;
  fromStageName: string;
  toStageName: string;
  movedAt: string;
  movedByName?: string;
} & RegStagePayload;

export type KanbanState = {
  stageIndex: number;
  stageEnteredAt: string;
  notes?: string;
  finalStageEnteredAt?: string;
};

// "Registration Done" still auto-creates the Feasibility entry (see registration.tsx) —
// that trigger stays tied to this specific stage, separate from the final-stage TTL below.
export const REG_DONE_STAGE_IDX = REG_STAGES.indexOf("Registration Done");
// "Bank Upload" is now the pipeline's terminal stage — a card sits there for 24h
// before being pruned (see deleteExpiredRegistrationFinalStageCards). "Registration
// Done" itself no longer expires; cards stay there until moved forward manually.
export const REG_FINAL_STAGE_IDX = REG_STAGES.indexOf("Bank Upload");
export const REG_FINAL_STAGE_TTL_MS = 24 * 60 * 60 * 1000;

// Only customers with an actual registration_kanban_cards row show up here —
// a new customer no longer defaults into "Ready to Register". They now start
// in Document Verification's "Pending Verification" and only get a row here
// once that page's "All Good" confirmation clears every category.
export function buildKanbanCards(
  customers: Customer[],
  states: Record<string, KanbanState>,
): RegKanbanCard[] {
  return customers
    .filter((c) => states[c.customerId])
    .map((c) => {
      const state = states[c.customerId];
      return {
        customerId: c.customerId,
        customerName: c.name,
        phone: c.phone,
        city: c.city,
        capacity: c.capacity,
        stageIndex: state.stageIndex,
        stageEnteredAt: state.stageEnteredAt,
        notes: state.notes,
        finalStageEnteredAt: state.finalStageEnteredAt,
        source: c.source,
        paid: c.paid,
        finance: c.finance,
        panelBrand: c.panelBrand,
        wp: c.wp,
        numPanels: c.numPanels,
        inverterKw: c.inverterKw,
        inverterBrand: c.inverterBrand,
        pdcFacilityGiven: c.pdcFacilityGiven,
      };
    });
}
