import type { Customer } from "./customersStore";

export const SUBSIDY_STAGES = [
  "Pending to Claim Subsidy",
  "Subsidy Claimed",
  "Return for correction",
  "Claim Verified",
  "Subsidy Disbursed",
] as const;

export const SUBSIDY_DONE_STAGE_IDX = SUBSIDY_STAGES.indexOf("Subsidy Disbursed");
export const SUBSIDY_DONE_TTL_MS = 24 * 60 * 60 * 1000;

export type SubsidyKanbanCard = {
  customerId: string;
  customerName: string;
  phone: string;
  city: string;
  capacity: string;
  stageIndex: number;
  stageName: string;
  stageEnteredAt: string;
  finance?: string;
  source?: string;
  paid?: string;
  panelBrand?: string;
  wp?: string;
  numPanels?: string;
  inverterBrand?: string;
  inverterKw?: string;
  pdcFacilityGiven?: "Yes" | "No";
};

export type SubsidyStagePayload = {
  notes?: string;
  stageDate?: string;
  followDate?: string;
  issue?: string;
};

export type SubsidyStageHistoryEntry = {
  fromStageIdx: number;
  toStageIdx: number;
  fromStageName: string;
  toStageName: string;
  movedAt: string;
  movedByName?: string;
} & SubsidyStagePayload;

type KanbanState = { stageIndex: number; stageName: string; stageEnteredAt: string };

export function buildSubsidyKanbanCards(
  customers: Customer[],
  states: Record<string, KanbanState>,
): SubsidyKanbanCard[] {
  return customers.map((c) => {
    const state = states[c.customerId] ?? {
      stageIndex: 0,
      stageName: SUBSIDY_STAGES[0],
      stageEnteredAt: (c.since || new Date().toISOString().slice(0, 10)) + "T00:00:00",
    };
    return {
      customerId: c.customerId,
      customerName: c.name,
      phone: c.phone,
      city: c.city,
      capacity: c.capacity,
      stageIndex: state.stageIndex,
      stageName: state.stageName,
      stageEnteredAt: state.stageEnteredAt,
      finance: c.finance,
      source: c.source,
      paid: c.paid,
      panelBrand: c.panelBrand,
      wp: c.wp,
      numPanels: c.numPanels,
      inverterBrand: c.inverterBrand,
      inverterKw: c.inverterKw,
      pdcFacilityGiven: c.pdcFacilityGiven,
    };
  });
}
