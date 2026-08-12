export const PAYMENT_STAGES = [
  "Payment Collected",
  "Payment Received",
  "Payment Deposited",
  "Payment Credited",
  "Payment Rejected",
] as const;

export type PaymentCard = {
  id:             number;
  customerId:     string;
  customerName:   string;
  phone:          string;
  city:           string;
  capacity:       string;
  amount:         string;
  stageIndex:     number;
  stageEnteredAt: string;
  notes:          string;
  stageDate?:     string;
  followDate?:    string;
};

export type PaymentStagePayload = {
  notes?:      string;
  stageDate?:  string;
  followDate?: string;
};

export type PaymentHistoryEntry = {
  fromStageIdx:  number;
  toStageIdx:    number;
  fromStageName: string;
  toStageName:   string;
  movedAt:       string;
  notes?:        string;
  stageDate?:    string;
  followDate?:   string;
};

const MOCK_CARDS: PaymentCard[] = [
  {
    id: 1, customerId: "ASPL-001", customerName: "Ramesh Sharma",
    phone: "+91 98765 43210", city: "Jaipur", capacity: "5 kW", amount: "₹45,000",
    stageIndex: 0, stageEnteredAt: "2026-05-20T09:00:00", notes: "Cash payment received at site.",
  },
  {
    id: 2, customerId: "ASPL-002", customerName: "Sunita Verma",
    phone: "+91 98123 45678", city: "Jodhpur", capacity: "3 kW", amount: "₹27,000",
    stageIndex: 0, stageEnteredAt: "2026-05-22T10:30:00", notes: "Cheque received, pending deposit.",
  },
  {
    id: 3, customerId: "ASPL-003", customerName: "Manoj Patel",
    phone: "+91 98012 34567", city: "Udaipur", capacity: "10 kW", amount: "₹90,000",
    stageIndex: 1, stageEnteredAt: "2026-05-18T11:00:00", notes: "NEFT transfer confirmed by customer.",
  },
  {
    id: 4, customerId: "ASPL-004", customerName: "Priya Mehta",
    phone: "+91 99001 23456", city: "Ajmer", capacity: "7 kW", amount: "₹63,000",
    stageIndex: 1, stageEnteredAt: "2026-05-15T14:00:00", notes: "UPI payment confirmed.",
  },
  {
    id: 5, customerId: "ASPL-005", customerName: "Ravi Kumar",
    phone: "+91 97654 32109", city: "Bikaner", capacity: "8 kW", amount: "₹72,000",
    stageIndex: 2, stageEnteredAt: "2026-05-12T09:30:00", notes: "Deposited at SBI branch.",
  },
  {
    id: 6, customerId: "ASPL-006", customerName: "Kavita Singh",
    phone: "+91 96543 21098", city: "Kota", capacity: "4 kW", amount: "₹36,000",
    stageIndex: 3, stageEnteredAt: "2026-05-10T10:00:00", notes: "Credited to company account.",
  },
  {
    id: 7, customerId: "ASPL-007", customerName: "Dhrumil Patel",
    phone: "+91 78020 32338", city: "Vadodara", capacity: "150 kW", amount: "₹13,50,000",
    stageIndex: 3, stageEnteredAt: "2026-05-08T08:00:00", notes: "Large commercial project — amount verified.",
  },
  {
    id: 8, customerId: "ASPL-008", customerName: "Arjun Sharma",
    phone: "+91 95432 10987", city: "Surat", capacity: "6 kW", amount: "₹54,000",
    stageIndex: 4, stageEnteredAt: "2026-05-05T11:00:00", notes: "Cheque bounced — customer informed.",
  },
];

const stageOverrides: Record<number, {
  stageIndex: number; stageEnteredAt: string;
  notes?: string; stageDate?: string; followDate?: string;
}> = {};

const paymentHistory: Record<number, PaymentHistoryEntry[]> = {};

export function getPaymentCards(): PaymentCard[] {
  return MOCK_CARDS.map(c => {
    const ov = stageOverrides[c.id];
    if (!ov) return c;
    return { ...c, stageIndex: ov.stageIndex, stageEnteredAt: ov.stageEnteredAt, notes: ov.notes ?? c.notes, stageDate: ov.stageDate, followDate: ov.followDate };
  });
}

export function movePaymentCard(
  id: number, fromStageIdx: number, toStageIdx: number,
  fromStageName: string, toStageName: string, payload?: PaymentStagePayload,
): void {
  stageOverrides[id] = { stageIndex: toStageIdx, stageEnteredAt: new Date().toISOString(), ...payload };
  if (!paymentHistory[id]) paymentHistory[id] = [];
  paymentHistory[id].push({ fromStageIdx, toStageIdx, fromStageName, toStageName, movedAt: new Date().toISOString(), ...payload });
}

export function getPaymentHistory(id: number): PaymentHistoryEntry[] {
  return paymentHistory[id] ?? [];
}
