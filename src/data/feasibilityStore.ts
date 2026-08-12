import type { Customer } from "./customersStore";

export const FEASIBILITY_STAGES = [
  "Feasibility Approved",
  "SR Collection",
  "SR Generated",
  "Estimate Generated",
  "Pay Estimate",
  "Estimate Paid",
] as const;

export type FeasibilityStage = (typeof FEASIBILITY_STAGES)[number];

export const FEASIBILITY_DONE_STAGE_IDX = FEASIBILITY_STAGES.indexOf("Estimate Paid");
export const FEASIBILITY_PAY_ESTIMATE_IDX = FEASIBILITY_STAGES.indexOf("Pay Estimate");
export const FEASIBILITY_DONE_TTL_MS = 24 * 60 * 60 * 1000;

export type FeasibilityKanbanState = {
  stageIndex: number;
  stageEnteredAt: string;
  notes?: string;
  date?: string;
  payEstimateDate?: string;
  estimateAmount?: string;
  srNumber?: string;
};

export type FeasibilityCard = {
  customerId: string;
  customerName: string;
  phone: string;
  city: string;
  capacity: string;
  stageIndex: number;
  stageEnteredAt: string;
  notes?: string;
  date?: string;
  payEstimateDate?: string;
  estimateAmount?: string;
  srNumber?: string;
  source?: string;
  paid?: string;
  finance?: string;
  panelBrand?: string;
  wp?: string;
  numPanels?: string;
  inverterBrand?: string;
  inverterKw?: string;
  pdcFacilityGiven?: "Yes" | "No";
};

export type FeasibilityStagePayload = {
  notes?: string;
  date?: string;
  payEstimateDate?: string;
  estimateAmount?: string;
  srNumber?: string;
};

export type FeasibilityHistoryEntry = {
  fromStageIdx: number;
  toStageIdx: number;
  fromStageName: string;
  toStageName: string;
  movedAt: string;
  movedByName?: string;
  notes?: string;
  date?: string;
  payEstimateDate?: string;
  estimateAmount?: string;
  srNumber?: string;
};

export function buildFeasibilityCards(
  customers: Customer[],
  states: Record<string, FeasibilityKanbanState>,
): FeasibilityCard[] {
  return customers.map((c) => {
    const state = states[c.customerId];
    return {
      customerId: c.customerId,
      customerName: c.name,
      phone: c.phone,
      city: c.city,
      capacity: c.capacity,
      stageIndex: state?.stageIndex ?? 0,
      stageEnteredAt: state?.stageEnteredAt ?? new Date().toISOString(),
      notes: state?.notes,
      date: state?.date,
      payEstimateDate: state?.payEstimateDate,
      estimateAmount: state?.estimateAmount,
      srNumber: state?.srNumber,
      source: c.source,
      paid: c.paid,
      finance: c.finance,
      panelBrand: c.panelBrand,
      wp: c.wp,
      numPanels: c.numPanels,
      inverterBrand: c.inverterBrand,
      inverterKw: c.inverterKw,
      pdcFacilityGiven: c.pdcFacilityGiven,
    };
  });
}
