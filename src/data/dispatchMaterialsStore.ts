import type { MaterialItem } from "./dispatchKanbanStore";

// Module-level shared state — persists across SPA navigations within a session.
// Dispatch page writes here; Installations page reads to show material progress.
const store: Record<string, MaterialItem[]> = {};
const listeners = new Set<() => void>();

export function getMaterials(customerId: string): MaterialItem[] {
  return store[customerId] ?? [];
}

export function setMaterials(customerId: string, items: MaterialItem[]): void {
  store[customerId] = items;
  listeners.forEach(fn => fn());
}

export function subscribeToMaterials(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getTotals(customerId: string): { required: number; dispatched: number; pct: number } {
  const items = store[customerId] ?? [];
  const required   = items.reduce((s, m) => s + m.requiredQty, 0);
  const dispatched = items.reduce((s, m) => s + m.dispatchedQty, 0);
  const pct        = required > 0 ? Math.round((dispatched / required) * 100) : 0;
  return { required, dispatched, pct };
}
