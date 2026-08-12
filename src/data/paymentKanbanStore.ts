export type PaymentMode = "CASH" | "CHEQUE" | "NEFT" | "RTGS" | "UPI" | "DD" | "PDC";

// Each mode has its own stage flow; stageIndex on a card is relative to its own mode's array.
export const PAYMENT_STAGES: Record<PaymentMode, string[]> = {
  CASH: ["Payment Received", "Payment Deposited", "Payment Credited"],
  CHEQUE: ["Payment Received", "Payment Deposited", "Payment Credited", "Payment Rejected"],
  NEFT: ["Payment Received", "Payment Credited"],
  RTGS: ["Payment Received", "Payment Credited"],
  UPI: ["Payment Received", "Payment Credited"],
  // Same flow as CHEQUE, minus the Rejected stage — a demand draft can't bounce
  // the way a cheque can, so there's nothing to re-add at "Payment Received" for.
  DD: ["Payment Received", "Payment Deposited", "Payment Credited"],
  // Same base flow as CHEQUE, plus a Subsidy Disbursed stage after credit — tracked
  // as its own mode/kanban, entirely separate from regular CHEQUE cards.
  PDC: [
    "Payment Received",
    "Subsidy Disbursed",
    "Payment Deposited",
    "Payment Credited",
    "Payment Rejected",
  ],
};

// The top-level toggle shown above the mode tabs. A payment is either self-funded
// or routed through the bank — this is stored per-card since NEFT/RTGS can occur
// under either category (a self bank transfer vs. a bank-initiated disbursement).
export type PaymentCategory = "SELF" | "BANK";

export const CATEGORY_LABEL: Record<PaymentCategory, string> = {
  SELF: "Self",
  BANK: "Bank",
};

// NEFT, RTGS and UPI share the same flow and are shown as one combined "Online" tab.
export type PaymentTabGroup = "CASH" | "CHEQUE" | "PDC" | "ONLINE" | "DD";

export function getTabGroup(mode: PaymentMode): PaymentTabGroup {
  if (mode === "CASH") return "CASH";
  if (mode === "CHEQUE") return "CHEQUE";
  if (mode === "PDC") return "PDC";
  if (mode === "DD") return "DD";
  return "ONLINE";
}

// Which mode-tabs appear under each category, and which specific modes the
// "Payment Type" dropdown offers once that category is selected.
export const CATEGORY_TABS: Record<PaymentCategory, PaymentTabGroup[]> = {
  SELF: ["CASH", "CHEQUE", "PDC", "ONLINE"],
  BANK: ["ONLINE", "DD"],
};

export const CATEGORY_MODE_OPTIONS: Record<PaymentCategory, PaymentMode[]> = {
  SELF: ["CASH", "CHEQUE", "PDC", "NEFT", "RTGS", "UPI"],
  BANK: ["NEFT", "RTGS", "DD"],
};

export const MODE_LABEL: Record<PaymentMode, string> = {
  CASH: "Cash",
  CHEQUE: "Cheque",
  NEFT: "NEFT",
  RTGS: "RTGS",
  UPI: "UPI",
  DD: "Demand Draft",
  PDC: "PDC",
};

// "Payment Deposited" + CHEQUE → "Cheque Deposited"; generic stage names stay
// generic only when no single mode applies (e.g. the mixed "Online" tab header).
export function displayStageName(mode: PaymentMode, stageName: string): string {
  return `${MODE_LABEL[mode]} ${stageName.replace(/^Payment\s+/i, "")}`;
}

// "Payment Credited" is each mode's actual done state — not necessarily the last
// index in its stages array (CHEQUE/PDC also have a trailing "Payment Rejected"
// dead-end, which is never archived since a rejected payment still needs action).
export const PAYMENT_DONE_STAGE_IDX: Record<PaymentMode, number> = Object.fromEntries(
  (Object.keys(PAYMENT_STAGES) as PaymentMode[]).map((mode) => [
    mode,
    PAYMENT_STAGES[mode].indexOf("Payment Credited"),
  ]),
) as Record<PaymentMode, number>;

export const PAYMENT_DONE_TTL_MS = 24 * 60 * 60 * 1000;

export type PaymentCard = {
  id: number;
  customerId: string;
  customerName: string;
  phone: string;
  city: string;
  capacity: string;
  amount: string;
  mode: PaymentMode;
  category: PaymentCategory;
  stageIndex: number;
  stageEnteredAt: string;
  createdAt: string; // immutable — when the payment was first added, unlike stageEnteredAt
  notes: string;
  stageDate?: string;
  paymentCollected?: string;
  chequeNo?: string;
  chequeDate?: string;
  bankName?: string;
  branch?: string;
};

export type PaymentStagePayload = {
  notes?: string;
  stageDate?: string;
  paymentCollected?: string;
};

export type PaymentHistoryEntry = {
  fromStageIdx: number;
  toStageIdx: number;
  fromStageName: string;
  toStageName: string;
  movedAt: string;
  movedByName?: string;
} & PaymentStagePayload;

// No seed data — the kanban starts empty and only fills via the Add Payment form.
export const MOCK_PAYMENT_CARDS: PaymentCard[] = [];
