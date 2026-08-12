export type DbOperation = "SELECT" | "INSERT" | "UPDATE" | "UPSERT" | "DELETE";

export type QueryEntry = {
  id: string;
  table: string;
  operation: DbOperation;
  type: "read" | "write";
  rowCount: number;
  timestamp: number;
};

type Listener = () => void;

class QueryTracker {
  private _entries: QueryEntry[] = [];
  private _listeners = new Set<Listener>();

  track(entry: Omit<QueryEntry, "id" | "timestamp">) {
    this._entries = [
      ...this._entries,
      { ...entry, id: Math.random().toString(36).slice(2), timestamp: Date.now() },
    ];
    this._listeners.forEach((fn) => fn());
  }

  clear() {
    this._entries = [];
    this._listeners.forEach((fn) => fn());
  }

  getSnapshot() {
    return this._entries;
  }

  subscribe(fn: Listener) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
}

export const queryTracker = new QueryTracker();
