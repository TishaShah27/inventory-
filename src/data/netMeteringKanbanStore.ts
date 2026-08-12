import type { Customer } from "./customersStore";

export const NM_STAGES = [
  "Pending Meter Installation",
  "Net Meter Installed",
  "Net Metering Completed",
] as const;

export const NM_DONE_STAGE_IDX = NM_STAGES.indexOf("Net Metering Completed");
export const NM_DONE_TTL_MS = 24 * 60 * 60 * 1000;

export type NmKanbanCard = {
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

export type NmStagePayload = {
  notes?: string;
  meterInstallDate?: string;
  wifiComment?: string;
  assigneeId?: string;
  assigneeName?: string;
};

export type NmStageHistoryEntry = {
  fromStageIdx: number;
  toStageIdx: number;
  fromStageName: string;
  toStageName: string;
  movedAt: string;
  movedByName?: string;
} & NmStagePayload;

type KanbanState = { stageIndex: number; stageName: string; stageEnteredAt: string };

export function buildNmKanbanCards(
  customers: Customer[],
  states: Record<string, KanbanState>,
): NmKanbanCard[] {
  return customers.map((c) => {
    const state = states[c.customerId] ?? {
      stageIndex: 0,
      stageName: NM_STAGES[0],
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
