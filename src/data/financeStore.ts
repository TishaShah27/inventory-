import type { Customer } from "./customersStore";

export type FinanceProvider = "BAJAJ" | "SOLFIN" | "JAN SAMARTH";

export const STAGES: Record<FinanceProvider, string[]> = {
  BAJAJ: [
    "Document Collection",
    "Submitted to Bajaj",
    "Loan Sanctioned",
    "1st Disbursed",
    "Installation Completed",
    "Final Bank Process",
    "Final Disbursed",
  ],
  SOLFIN: [
    "Document Collection",
    "Submitted to Solfin",
    "Loan Sanctioned",
    "1st Disbursed",
    "Installation Completed",
    "Final Bank Process",
    "Final Disbursed",
  ],
  "JAN SAMARTH": [
    "Document Collection",
    "Portal Registration",
    "Loan File Issued",
    "Customer Bank Visited",
    "Loan Sanctioned",
    "Bank Site Inspected",
    "Agreement Signed",
    "1st Disbursed",
    "Installation Completed",
    "2nd Loan File Issued",
    "2nd Bank Visited",
    "Final Bank Process",
    "Final Disbursed",
  ],
};

// "Installation Completed" is never set by hand — it's pushed automatically once every
// Installations "Work in Progress" stage (not PCC) is marked done for that customer.
// See advanceFinanceToInstallationCompleted() in financeKanbanService.ts.
export const FINANCE_INSTALL_COMPLETE_STAGE_IDX: Record<FinanceProvider, number> = {
  BAJAJ: STAGES.BAJAJ.indexOf("Installation Completed"),
  SOLFIN: STAGES.SOLFIN.indexOf("Installation Completed"),
  "JAN SAMARTH": STAGES["JAN SAMARTH"].indexOf("Installation Completed"),
};

// "Final Disbursed" is the terminal stage for every provider, but it sits at a
// different index in each provider's own stage array (JAN SAMARTH has more stages).
export const FINANCE_DONE_STAGE_IDX: Record<FinanceProvider, number> = {
  BAJAJ: STAGES.BAJAJ.indexOf("Final Disbursed"),
  SOLFIN: STAGES.SOLFIN.indexOf("Final Disbursed"),
  "JAN SAMARTH": STAGES["JAN SAMARTH"].indexOf("Final Disbursed"),
};
export const FINANCE_DONE_TTL_MS = 24 * 60 * 60 * 1000;

export type FinanceKanbanState = {
  stageIndex: number;
  stageEnteredAt: string;
  notes?: string;
  stageDate?: string;
  followDate?: string;
  bank?: string;
  loanAmount?: string;
  dp?: string;
  firstDisbAmt?: string;
  secondDisbAmt?: string;
};

export type KanbanCard = {
  customerId: string;
  regNumber: string;
  customerName: string;
  phone: string;
  city: string;
  capacity: string;
  finance: FinanceProvider;
  stageIndex: number;
  stageEnteredAt: string;
  notes?: string;
  stageDate?: string;
  followDate?: string;
  bank?: string;
  loanAmount?: string;
  dp?: string;
  firstDisbAmt?: string;
  secondDisbAmt?: string;
  source?: string;
  paid?: string;
  panelBrand?: string;
  wp?: string;
  numPanels?: string;
  inverterBrand?: string;
  inverterKw?: string;
  pdcFacilityGiven?: "Yes" | "No";
};

export type StagePayload = {
  notes?: string;
  stageDate?: string;
  followDate?: string;
  bank?: string;
  loanAmount?: string;
  dp?: string;
  firstDisbAmt?: string;
  secondDisbAmt?: string;
  // Only used transiently when confirming the move into "1st Disbursed" — tells the
  // caller which payment-bank kanban card to create. Not persisted on the finance card itself.
  disbMode?: "ONLINE" | "DD";
};

export type StageHistoryEntry = {
  fromStageIdx: number;
  toStageIdx: number;
  fromStageName: string;
  toStageName: string;
  movedAt: string;
  movedByName?: string;
  notes?: string;
  stageDate?: string;
  followDate?: string;
  bank?: string;
  loanAmount?: string;
  dp?: string;
  firstDisbAmt?: string;
  secondDisbAmt?: string;
};

export function buildFinanceCards(
  customers: Customer[],
  provider: FinanceProvider,
  states: Record<string, FinanceKanbanState>,
): KanbanCard[] {
  return customers
    .filter((c) => c.finance === provider)
    .map((c) => {
      const state = states[c.customerId];
      return {
        customerId: c.customerId,
        regNumber: c.customerId,
        customerName: c.name,
        phone: c.phone,
        city: c.city,
        capacity: c.capacity,
        finance: provider,
        stageIndex: state?.stageIndex ?? 0,
        stageEnteredAt: state?.stageEnteredAt ?? new Date().toISOString(),
        notes: state?.notes,
        stageDate: state?.stageDate,
        followDate: state?.followDate,
        bank: state?.bank,
        loanAmount: state?.loanAmount,
        dp: state?.dp,
        firstDisbAmt: state?.firstDisbAmt,
        secondDisbAmt: state?.secondDisbAmt,
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
