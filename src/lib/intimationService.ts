import { supabase } from "./supabase";
import { fetchCustomersByIds, isGujaratSchemeCustomer } from "./customerService";
import type { Customer } from "@/data/customersStore";

export type IntimationDocRow = {
  customer_id:        string;
  entered_at:         string;
  self_cert:          string | null;
  gps_photo:          string | null;
  dcr_cert:           string | null;
  model_agreement:    string | null;
  submitted_to_nm_at: string | null;
};

export type IntimationDocField = "self_cert" | "gps_photo" | "dcr_cert" | "model_agreement";

export type IntimationPageData = {
  customers: Customer[];
  docRows:   Record<string, IntimationDocRow>;
};

export async function fetchIntimationData(): Promise<IntimationDocRow[]> {
  const { data, error } = await supabase
    .from("intimation_customers")
    .select("customer_id, entered_at, self_cert, gps_photo, dcr_cert, model_agreement, submitted_to_nm_at")
    .order("entered_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IntimationDocRow[];
}

export async function fetchIntimationPageData(): Promise<IntimationPageData> {
  const rows = await fetchIntimationData();
  const ids  = rows.map(r => r.customer_id);
  if (ids.length === 0) return { customers: [], docRows: {} };

  let foundCustomers: Customer[] = [];
  try {
    foundCustomers = await fetchCustomersByIds(ids);
  } catch {
    // customers table unavailable — still render stubs below
  }

  const foundIds = new Set(foundCustomers.map(c => c.customerId));
  const gujaratIds = new Set(foundCustomers.filter(isGujaratSchemeCustomer).map(c => c.customerId));

  // Create a stub for every intimation row that has no matching customer record
  // so orphaned rows are never silently hidden in the UI
  const stubs: Customer[] = ids
    .filter(id => !foundIds.has(id) && !gujaratIds.has(id))
    .map(id => ({
      id: 0, customerId: id, name: id,
      phone: "", email: "", capacity: "", city: "",
      since: "", paid: "", status: "Active", type: "On-grid", notes: "",
    }));

  const customers = foundCustomers.filter(c => !gujaratIds.has(c.customerId));
  const docRows = Object.fromEntries(
    rows.filter(r => !gujaratIds.has(r.customer_id)).map(r => [r.customer_id, r]),
  );
  return { customers: [...customers, ...stubs], docRows };
}

export async function submitToNetMetering(customerId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("intimation_customers")
    .update({ submitted_to_nm_at: now })
    .eq("customer_id", customerId);
  if (error) throw error;
}

export async function addToIntimationIfAbsent(customerId: string): Promise<void> {
  const { error } = await supabase
    .from("intimation_customers")
    .upsert({ customer_id: customerId }, { onConflict: "customer_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function updateIntimationDoc(
  customerId: string,
  field: IntimationDocField,
  value: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("intimation_customers")
    .update({ [field]: value })
    .eq("customer_id", customerId);
  if (error) throw error;
}
