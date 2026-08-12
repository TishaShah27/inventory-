import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { queryTracker } from "./queryTracker";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "dummy-anon-key-placeholder";

const rawClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Recursively wrap any returned builder so filter chains (.eq, .in, .order, …) keep the .then interceptor
function wrapBuilder(builder: any, table: string, operation: string, type: "read" | "write"): any {
  return new Proxy(builder, {
    get(target, prop) {
      if (prop === "then") {
        return (resolve: any, reject: any) =>
          target.then((result: any) => {
            const rows = Array.isArray(result?.data) ? result.data.length : result?.data ? 1 : 0;
            queryTracker.track({ table, operation: operation as any, type, rowCount: result?.error ? 0 : rows });
            return resolve?.(result);
          }, reject);
      }
      const val = target[prop];
      if (typeof val !== "function") return val;
      return (...args: any[]) => {
        const ret = val.apply(target, args);
        // Re-wrap thenable returns so chained filter methods (.eq, .in, .order, .single, …) stay tracked.
        // postgrest-js returns `this` from most methods, so we must NOT gate on `ret !== target`.
        if (ret && typeof ret === "object" && typeof ret.then === "function") {
          return wrapBuilder(ret, table, operation, type);
        }
        return ret;
      };
    },
  });
}

const READ_OPS  = ["select"] as const;
const WRITE_OPS = ["insert", "update", "upsert", "delete"] as const;
const TRACKED   = new Set([...READ_OPS, ...WRITE_OPS]);

export const supabase = new Proxy(rawClient, {
  get(target, prop) {
    if (prop === "from") {
      return (table: string) => {
        const qb = (target as any).from(table);
        return new Proxy(qb, {
          get(qbTarget, qbProp) {
            const val = qbTarget[qbProp];
            if (typeof qbProp === "string" && TRACKED.has(qbProp as any) && typeof val === "function") {
              const type = (READ_OPS as readonly string[]).includes(qbProp) ? "read" : "write";
              return (...args: any[]) => wrapBuilder(val.apply(qbTarget, args), table, qbProp.toUpperCase(), type);
            }
            return typeof val === "function" ? val.bind(qbTarget) : val;
          },
        });
      };
    }
    const val = (target as any)[prop];
    return typeof val === "function" ? val.bind(target) : val;
  },
}) as SupabaseClient;
