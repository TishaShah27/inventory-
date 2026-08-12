import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tone = "primary" | "info" | "warning" | "destructive";
const toneMap: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  info: "bg-[oklch(0.95_0.04_240)] text-[oklch(0.5_0.15_240)] dark:bg-[oklch(0.3_0.08_240)] dark:text-[oklch(0.85_0.1_240)]",
  warning: "bg-[oklch(0.96_0.05_75)] text-[oklch(0.5_0.14_70)] dark:bg-[oklch(0.3_0.08_70)] dark:text-[oklch(0.88_0.12_75)]",
  destructive: "bg-[oklch(0.96_0.04_25)] text-[oklch(0.55_0.2_25)] dark:bg-[oklch(0.3_0.1_25)] dark:text-[oklch(0.85_0.15_25)]",
};

export function StatCard({
  icon: Icon, label, value, sub, change, tone = "primary", index = 0,
}: { icon: LucideIcon; label: string; value: string; sub?: string; change?: number; tone?: Tone; index?: number }) {
  const positive = (change ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -1 }}
      className="group rounded-xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-card"
    >
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {typeof change === "number" && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            positive ? "bg-primary-soft text-primary" : "bg-[oklch(0.96_0.04_25)] text-[oklch(0.55_0.2_25)] dark:bg-[oklch(0.3_0.1_25)] dark:text-[oklch(0.85_0.15_25)]"
          }`}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="mt-5 text-[26px] font-semibold tracking-tight leading-none">{value}</div>
      <div className="mt-2 text-[13px] font-medium text-foreground">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </motion.div>
  );
}
