import type { Customer } from "./customersStore";

// Module-level shared state — persists across SPA navigations within a session.
// WaitingFloor writes here; Dispatch page reads to build the kanban.
const queue: Customer[] = [];
const listeners = new Set<() => void>();

export function getDispatchQueue(): Customer[] {
  return [...queue];
}

export function addToDispatchQueue(customer: Customer): void {
  if (!queue.find(c => c.customerId === customer.customerId)) {
    queue.push(customer);
    listeners.forEach(fn => fn());
  }
}

export function isInDispatchQueue(customerId: string): boolean {
  return !!queue.find(c => c.customerId === customerId);
}

export function removeFromDispatchQueue(customerId: string): void {
  const idx = queue.findIndex(c => c.customerId === customerId);
  if (idx !== -1) {
    queue.splice(idx, 1);
    listeners.forEach(fn => fn());
  }
}

export function subscribeToDispatchQueue(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
