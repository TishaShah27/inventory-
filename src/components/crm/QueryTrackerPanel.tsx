import { useState, useSyncExternalStore, useRef, useEffect } from "react";
import { Database, X, ChevronDown, ChevronUp } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { queryTracker } from "@/lib/queryTracker";
import { cn } from "@/lib/utils";

const EMPTY_SNAPSHOT: never[] = [];

function useQueryEntries() {
  return useSyncExternalStore(
    (fn) => queryTracker.subscribe(fn),
    () => queryTracker.getSnapshot(),
    () => EMPTY_SNAPSHOT,
  );
}

function prettyTable(table: string) {
  return table.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function relTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function routeLabel(pathname: string) {
  if (pathname === "/") return "Dashboard";
  return pathname
    .slice(1)
    .split("/")[0]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function QueryTrackerPanel() {
  const [open, setOpen] = useState(false);
  const entries = useQueryEntries();
  const panelRef = useRef<HTMLDivElement>(null);

  const { location } = useRouterState();
  const pathname = location.pathname;
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      queryTracker.clear();
      prevPath.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const reads  = entries.filter((e) => e.type === "read").length;
  const writes = entries.filter((e) => e.type === "write").length;
  const total  = reads + writes;

  const tableMap = new Map<string, { reads: number; writes: number }>();
  for (const e of entries) {
    if (!tableMap.has(e.table)) tableMap.set(e.table, { reads: 0, writes: 0 });
    const t = tableMap.get(e.table)!;
    if (e.type === "read") t.reads++; else t.writes++;
  }
  const breakdown = Array.from(tableMap.entries()).map(([table, c]) => ({ table, ...c }));

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium transition hover:bg-muted",
          open && "border-primary/40 bg-muted",
        )}
        title="DB query tracker"
      >
        <Database className="h-[15px] w-[15px] text-primary shrink-0" />
        <span className="hidden sm:flex items-center gap-1 font-mono text-[11px]">
          <span className="text-blue-500">{reads}R</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-amber-500">{writes}W</span>
        </span>
        {open
          ? <ChevronUp className="h-3 w-3 text-muted-foreground ml-0.5" />
          : <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[300px] rounded-xl border bg-card shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-muted/40 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold">{routeLabel(pathname)}</span>
            </div>
            <div className="flex items-center gap-1">
              {total > 0 && (
                <button
                  onClick={() => queryTracker.clear()}
                  className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {total === 0 ? (
            <div className="px-4 py-7 text-center text-xs text-muted-foreground">
              No queries fired on this page yet
            </div>
          ) : (
            <>
              {/* Per-table breakdown */}
              <div className="border-b">
                <div className="flex items-center px-3.5 pt-2.5 pb-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <span className="flex-1">Breakdown</span>
                  <span className="w-14 text-right text-blue-500">Reads</span>
                  <span className="w-14 text-right text-amber-500">Writes</span>
                </div>
                {breakdown.map(({ table, reads: r, writes: w }) => (
                  <div key={table} className="flex items-center px-3.5 py-1.5 hover:bg-muted/40 transition">
                    <span className="flex-1 truncate text-[11px] font-medium">{prettyTable(table)}</span>
                    <span className="w-14 text-right font-mono text-[11px] text-blue-500">{r || <span className="text-muted-foreground/40">—</span>}</span>
                    <span className="w-14 text-right font-mono text-[11px] text-amber-500">{w || <span className="text-muted-foreground/40">—</span>}</span>
                  </div>
                ))}
                <div className="flex items-center border-t bg-muted/30 px-3.5 py-2">
                  <span className="flex-1 text-[11px] font-bold">Total</span>
                  <span className="w-14 text-right font-mono text-[11px] font-bold text-blue-500">{reads}</span>
                  <span className="w-14 text-right font-mono text-[11px] font-bold text-amber-500">{writes}</span>
                </div>
              </div>

              {/* Recent query log */}
              <div className="max-h-52 overflow-y-auto">
                <div className="px-3.5 pt-2.5 pb-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Query log
                </div>
                {[...entries].reverse().map((e) => (
                  <div key={e.id} className="flex items-center gap-2 px-3.5 py-1.5 hover:bg-muted/30 transition">
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        e.type === "read"
                          ? "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                          : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
                      )}
                    >
                      {e.operation}
                    </span>
                    <span className="flex-1 truncate font-mono text-[10px]">{e.table}</span>
                    {e.type === "read" && (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{e.rowCount} rows</span>
                    )}
                    <span className="shrink-0 text-[9px] text-muted-foreground/50">{relTime(e.timestamp)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
