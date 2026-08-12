import type { Customer } from "./customersStore";

export const MOCK_DISPATCH_CUSTOMERS: Customer[] = [
  {
    id: 1,
    customerId: "ASPL-001",
    name: "Ramesh Sharma",
    phone: "9876543210",
    email: "",
    capacity: "5 kW",
    city: "Jaipur",
    since: "2024-01-10",
    paid: "",
    status: "Active",
    type: "On-grid",
    notes: "",
  },
  {
    id: 2,
    customerId: "ASPL-002",
    name: "Sunita Verma",
    phone: "9812345678",
    email: "",
    capacity: "3 kW",
    city: "Jodhpur",
    since: "2024-02-15",
    paid: "",
    status: "Active",
    type: "On-grid",
    notes: "",
  },
  {
    id: 3,
    customerId: "ASPL-003",
    name: "Manoj Patel",
    phone: "9801234567",
    email: "",
    capacity: "10 kW",
    city: "Udaipur",
    since: "2024-03-01",
    paid: "",
    status: "Active",
    type: "On-grid",
    notes: "",
  },
];

export const DISPATCH_STAGES = [
  "Pending Planning",
  "Pending Dispatch",
  "Dispatched Today",
] as const;

export const DISPATCH_DONE_STAGE_IDX = DISPATCH_STAGES.indexOf("Dispatched Today");
export const DISPATCH_DONE_TTL_MS = 24 * 60 * 60 * 1000;

export type DispatchKanbanCard = {
  customerId: string;
  customerName: string;
  phone: string;
  city: string;
  address?: string;
  capacity: string;
  stageIndex: number;
  stageEnteredAt: string;
  finance?: string;
  notes?: string;
  date?: string;
  plannedDispatchDate?: string;
  driverName?: string;
  challanNo?: string;
  source?: string;
  paid?: string;
  panelBrand?: string;
  wp?: string;
  numPanels?: string;
  inverterBrand?: string;
  inverterKw?: string;
  pdcFacilityGiven?: "Yes" | "No";
};

export type MaterialItem = {
  id: string;
  name: string;
  requiredQty: number;
  toBeDispatchedQty: number;
  dispatchedQty: number;
};

export type DispatchStagePayload = {
  notes?: string;
  date?: string;
  plannedDispatchDate?: string;
  materials?: MaterialItem[];
  driverName?: string;
  challanNo?: string;
};

export type DispatchStageHistoryEntry = {
  fromStageIdx: number;
  toStageIdx: number;
  fromStageName: string;
  toStageName: string;
  movedAt: string;
  movedByName?: string;
} & DispatchStagePayload;

type KanbanState = {
  stageIndex: number;
  stageEnteredAt: string;
  notes?: string;
  date?: string;
  plannedDispatchDate?: string;
  driverName?: string;
  challanNo?: string;
};

export function buildDispatchKanbanCards(
  customers: Customer[],
  states: Record<string, KanbanState>,
): DispatchKanbanCard[] {
  return customers.map((c) => {
    const state = states[c.customerId] ?? {
      stageIndex: 0,
      stageEnteredAt: (c.since || new Date().toISOString().slice(0, 10)) + "T00:00:00",
    };
    return {
      customerId: c.customerId,
      customerName: c.name,
      phone: c.phone,
      city: c.city,
      address: c.address,
      capacity: c.capacity,
      stageIndex: state.stageIndex,
      stageEnteredAt: state.stageEnteredAt,
      finance: c.finance,
      notes: state.notes,
      date: state.date,
      plannedDispatchDate: state.plannedDispatchDate,
      driverName: state.driverName,
      challanNo: state.challanNo,
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
