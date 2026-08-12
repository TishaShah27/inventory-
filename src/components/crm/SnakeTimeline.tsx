import { type ElementType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, IndianRupee, Wrench, Gauge, BadgeIndianRupee, Bell, Truck,
  ClipboardCheck, ClipboardSignature, HardHat, X,
} from "lucide-react";

export const PIPELINE_STAGES = [
  { key: "customer",      label: "Customer",      icon: User,               desc: "Onboarded",        detail: "Customer added to CRM. Basic KYC, contact info, and system requirements collected.",                                    url: "/customers"     },
  { key: "registration",  label: "Registration",  icon: ClipboardCheck,     desc: "Form filed",       detail: "Solar installation registration submitted to the relevant authority. Application number generated.",                     url: "/registration"  },
  { key: "feasibility",   label: "Feasibility",   icon: ClipboardSignature, desc: "Survey done",      detail: "On-site feasibility study completed. Roof survey, shadow analysis and load assessment done.",                            url: "/feasibility"   },
  { key: "finance",       label: "Finance",       icon: IndianRupee,        desc: "Loan arranged",    detail: "Loan or self-financing confirmed. Bank / NBFC sanction letter received and documented.",                                  url: "/finance"       },
  { key: "waiting-floor", label: "Waiting Floor", icon: HardHat,            desc: "Materials ready",  detail: "All solar panels, inverter and BOS materials procured and staged for dispatch.",                                        url: "/waiting-floor" },
  { key: "dispatch",      label: "Dispatch",      icon: Truck,              desc: "Shipped",          detail: "Solar panels, inverter, mounting structure and accessories dispatched to site.",                                          url: "/dispatch"      },
  { key: "installation",  label: "Installation",  icon: Wrench,             desc: "System installed", detail: "Solar PV system fully installed. Wiring, mounting, commissioning and testing completed.",                                url: "/installations" },
  { key: "intimation",    label: "Intimation",    icon: Bell,               desc: "Docs submitted",   detail: "Self-certificate, GPS photo, DCR certificate and model agreement submitted to DISCOM.",                                  url: "/intimation"    },
  { key: "net-metering",  label: "Net Metering",  icon: Gauge,              desc: "Meter connected",  detail: "Net meter installed and bidirectional connection to the grid established.",                                              url: "/net-metering"  },
  { key: "subsidy",       label: "Subsidy",       icon: BadgeIndianRupee,   desc: "Claimed",          detail: "PM Surya Ghar subsidy application filed. Disbursement initiated from portal.",                                           url: "/subsidy"       },
] as const;

const S_PATH = "M 50 50 H 480 C 545 50 545 145 480 145 H 50 C -15 145 -15 240 50 240 H 480";

const NODE_POS = [
  { x:  50, y:  50 },
  { x: 193, y:  50 },
  { x: 337, y:  50 },
  { x: 480, y:  50 },
  { x: 480, y: 145 },
  { x: 265, y: 145 },
  { x:  50, y: 145 },
  { x:  50, y: 240 },
  { x: 265, y: 240 },
  { x: 480, y: 240 },
] as const;

const LABEL_CFG = [
  { anchor: "middle" as const, dx: 0, dy: -24 },
  { anchor: "middle" as const, dx: 0, dy: -24 },
  { anchor: "middle" as const, dx: 0, dy: -24 },
  { anchor: "middle" as const, dx: 0, dy: -24 },
  { anchor: "middle" as const, dx: 0, dy:  24 },
  { anchor: "middle" as const, dx: 0, dy:  24 },
  { anchor: "middle" as const, dx: 0, dy:  24 },
  { anchor: "middle" as const, dx: 0, dy:  24 },
  { anchor: "middle" as const, dx: 0, dy:  24 },
  { anchor: "middle" as const, dx: 0, dy:  24 },
];

export function SnakeTimeline({ pipelineStage, onStageClick, selectedStage }: {
  pipelineStage: number;
  onStageClick: (idx: number) => void;
  selectedStage: number | null;
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Customer Lifecycle</h2>
        <p className="text-[10px] text-muted-foreground">Click a stage for details</p>
      </div>

      <div className="w-full" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <svg viewBox="-55 -42 610 358" className="w-full h-auto" style={{ display: "block", overflow: "visible" }}>

          <path d={S_PATH} fill="none" stroke="var(--border)" strokeWidth="2.5" strokeLinecap="round" />

          {NODE_POS.slice(0, -1).map((p, i) => {
            const n = NODE_POS[i + 1];
            if (pipelineStage <= i) return null;
            if (i === 3) return (
              <path key={i} d={`M ${p.x} ${p.y} C 545 ${p.y} 545 ${n.y} ${n.x} ${n.y}`}
                fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
            );
            if (i === 6) return (
              <path key={i} d={`M ${p.x} ${p.y} C -15 ${p.y} -15 ${n.y} ${n.x} ${n.y}`}
                fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
            );
            return (
              <line key={i} x1={p.x} y1={p.y} x2={n.x} y2={n.y}
                stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
            );
          })}

          {PIPELINE_STAGES.map((stage, i) => {
            const p    = NODE_POS[i];
            const lbl  = LABEL_CFG[i];
            const done = i < pipelineStage;
            const cur  = i === pipelineStage;
            const sel  = selectedStage === i;
            const Icon = stage.icon as ElementType;

            return (
              <g key={i} onClick={() => onStageClick(i)} style={{ cursor: "pointer" }}>
                {cur && (
                  <circle cx={p.x} cy={p.y} r="18"
                    fill="none" stroke="var(--primary)" strokeWidth="1.5" opacity="0.25" />
                )}
                {sel && (
                  <circle cx={p.x} cy={p.y} r="16"
                    fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="3 2" />
                )}
                <circle cx={p.x} cy={p.y} r="13"
                  fill={cur || done ? "var(--primary)" : "var(--card)"}
                  stroke={cur || done ? "var(--primary)" : "var(--border)"}
                  strokeWidth="1.5"
                />
                {done && !cur ? (
                  <polyline
                    points={`${p.x - 5},${p.y} ${p.x - 1.5},${p.y + 4} ${p.x + 6},${p.y - 5}`}
                    fill="none" stroke="white" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                ) : (
                  <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                    fontSize="9" fontWeight="800"
                    fill={cur ? "white" : "var(--muted-foreground)"}>
                    {i + 1}
                  </text>
                )}
                <text x={p.x + lbl.dx} y={p.y + lbl.dy}
                  textAnchor={lbl.anchor} fontSize="10"
                  fontWeight={cur ? "700" : done ? "600" : "500"}
                  fill={cur ? "var(--primary)" : done ? "var(--foreground)" : "var(--muted-foreground)"}>
                  {stage.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <AnimatePresence>
        {selectedStage !== null && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {(() => {
              const s      = PIPELINE_STAGES[selectedStage];
              const Icon   = s.icon as ElementType;
              const isDone = selectedStage < pipelineStage;
              const isCur  = selectedStage === pipelineStage;
              return (
                <div className="mt-4 rounded-xl border bg-muted/30 px-5 py-4 flex items-start gap-4">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isCur ? "gradient-primary" : isDone ? "bg-primary" : "bg-muted"}`}>
                    <Icon className={`h-5 w-5 ${isCur || isDone ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold">{s.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isCur ? "bg-primary text-white" : isDone ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                        {isCur ? "Current Stage" : isDone ? "Completed" : "Upcoming"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.detail}</p>
                  </div>
                  <button onClick={() => onStageClick(selectedStage)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
