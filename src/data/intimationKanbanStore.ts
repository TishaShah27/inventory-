import type { Customer } from "./customersStore";

export const INTIMATION_KANBAN_STAGES = [
  "Intimation Done",
  "Return for Correction",
  "Intimation Approved",
] as const;

export const INTIMATION_RETURN_STAGE_IDX =
  INTIMATION_KANBAN_STAGES.indexOf("Return for Correction");
export const INTIMATION_APPROVED_STAGE_IDX =
  INTIMATION_KANBAN_STAGES.indexOf("Intimation Approved");

export const INTIMATION_DONE_TTL_MS = 24 * 60 * 60 * 1000;

export type IntimationKanbanCard = {
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
  inverterBrand?: string;
  inverterKw?: string;
};

export type IntimationStagePayload = {
  notes?: string;
};

export type IntimationStageHistoryEntry = {
  fromStageIdx: number;
  toStageIdx: number;
  fromStageName: string;
  toStageName: string;
  movedAt: string;
  movedByName?: string;
} & IntimationStagePayload;

type KanbanState = { stageIndex: number; stageName: string; stageEnteredAt: string };

export function buildIntimationKanbanCards(
  customers: Customer[],
  states: Record<string, KanbanState>,
  enteredFallback: Record<string, string>,
): IntimationKanbanCard[] {
  return customers.map((c) => {
    const state = states[c.customerId] ?? {
      stageIndex: 0,
      stageName: INTIMATION_KANBAN_STAGES[0],
      stageEnteredAt: enteredFallback[c.customerId] ?? new Date().toISOString(),
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
      inverterBrand: c.inverterBrand,
      inverterKw: c.inverterKw,
    };
  });
}
