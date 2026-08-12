import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Filter, Download } from "lucide-react";
import { PageHeader } from "./PageHeader";

type Column = { key: string; label: string; render?: (row: any) => ReactNode };

export function DataPage<T extends Record<string, any>>({
  eyebrow, title, description, columns, rows, addLabel = "Add New",
  stats, onAdd,
}: {
  eyebrow?: string; title: string; description?: string;
  columns: Column[]; rows: T[]; addLabel?: string;
  stats?: { label: string; value: string; sub?: string }[];
  onAdd?: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-95">
            <Plus className="h-4 w-4" /> {addLabel}
          </button>
        }
      />
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className="mt-2 text-2xl font-bold">{s.value}</div>
              {s.sub && <div className="mt-0.5 text-xs text-muted-foreground">{s.sub}</div>}
            </motion.div>
          ))}
        </div>
      )}
      <div className="rounded-2xl border bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search..." className="h-10 w-full rounded-lg bg-muted/60 pl-10 pr-4 text-sm outline-none focus:bg-card focus:shadow-soft" />
          </div>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-muted"><Filter className="h-4 w-4" />Filter</button>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-muted"><Download className="h-4 w-4" />Export</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                {columns.map((c) => <th key={c.key} className="px-6 py-3 font-semibold">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t transition hover:bg-muted/40">
                  {columns.map((c) => <td key={c.key} className="px-6 py-4">{c.render ? c.render(r) : r[c.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
