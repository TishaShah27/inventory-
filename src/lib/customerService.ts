import { supabase } from "./supabase";
import type { Customer } from "@/data/customersStore";
import { dedupeRupeeSymbol } from "./utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDB(row: any): Customer {
  return {
    id:           row.id,
    customerId:   row.customer_id    ?? "",
    name:         row.name           ?? "",
    phone:        row.phone          ?? "",
    email:        row.email          ?? "",
    capacity:     row.capacity       ?? "",
    city:         row.city           ?? "",
    since:        row.since          ?? "",
    paid:         dedupeRupeeSymbol(row.paid),
    status:       row.status         ?? "Active",
    type:         row.type           ?? "On-grid",
    notes:        row.notes          ?? "",
    customerType: row.customer_type  ?? "New",
    consumerNo:   row.consumer_no    ?? "",
    source:       row.source         ?? "",
    finance:      row.finance        ?? "",
    scheme:       row.scheme         ?? "",
    aadhaarCard:  row.aadhaar_card   ?? "",
    address:      row.address        ?? "",
    pincode:      row.pincode        ?? "",
    latitude:     row.latitude       ?? "",
    longitude:    row.longitude      ?? "",
    wp:           row.wp             ?? "",
    numPanels:    row.num_panels     ?? "",
    panelBrand:   row.panel_brand    ?? "",
    inverterBrand:row.inverter_brand ?? "",
    inverterKw:   row.inverter_kw    ?? "",
    singlePhase:  row.single_phase   ?? false,
    dcCapacity:   row.dc_capacity    ?? "",
    warrantyStartDate: row.warranty_start_date ?? "",
    warrantyEndDate:   row.warranty_end_date   ?? "",
    pdcFacilityGiven:  row.pdc_facility_given  ?? undefined,
    tag:          row.tag            ?? "",
    discom:       row.discom         ?? "",
    circle:       row.circle         ?? "",
    division:     row.division       ?? "",
    subDivision:  row.sub_division   ?? "",
    password:     row.password       ?? "",
  };
}

type DBRow = Record<string, unknown>;

function toDB(c: Partial<Omit<Customer, "id" | "customerId">>): DBRow {
  const r: DBRow = {};
  if (c.name          !== undefined) r.name           = c.name;
  if (c.phone         !== undefined) r.phone          = c.phone;
  if (c.email         !== undefined) r.email          = c.email;
  if (c.capacity      !== undefined) r.capacity       = c.capacity;
  if (c.city          !== undefined) r.city           = c.city;
  if (c.since         !== undefined) r.since          = c.since;
  if (c.paid          !== undefined) r.paid           = c.paid;
  if (c.status        !== undefined) r.status         = c.status;
  if (c.type          !== undefined) r.type           = c.type;
  if (c.notes         !== undefined) r.notes          = c.notes;
  if (c.customerType  !== undefined) r.customer_type  = c.customerType;
  if (c.consumerNo    !== undefined) r.consumer_no    = c.consumerNo;
  if (c.source        !== undefined) r.source         = c.source;
  if (c.finance       !== undefined) r.finance        = c.finance;
  if (c.scheme        !== undefined) r.scheme         = c.scheme;
  if (c.aadhaarCard   !== undefined) r.aadhaar_card   = c.aadhaarCard;
  if (c.address       !== undefined) r.address        = c.address;
  if (c.pincode       !== undefined) r.pincode        = c.pincode;
  if (c.latitude      !== undefined) r.latitude       = c.latitude;
  if (c.longitude     !== undefined) r.longitude      = c.longitude;
  if (c.wp            !== undefined) r.wp             = c.wp;
  if (c.numPanels     !== undefined) r.num_panels     = c.numPanels;
  if (c.panelBrand    !== undefined) r.panel_brand    = c.panelBrand;
  if (c.inverterBrand !== undefined) r.inverter_brand = c.inverterBrand;
  if (c.inverterKw    !== undefined) r.inverter_kw    = c.inverterKw;
  if (c.singlePhase   !== undefined) r.single_phase   = c.singlePhase;
  if (c.dcCapacity    !== undefined) r.dc_capacity    = c.dcCapacity;
  if (c.warrantyStartDate !== undefined) r.warranty_start_date = c.warrantyStartDate || null;
  if (c.warrantyEndDate   !== undefined) r.warranty_end_date   = c.warrantyEndDate || null;
  if (c.pdcFacilityGiven  !== undefined) r.pdc_facility_given  = c.pdcFacilityGiven || null;
  if (c.tag           !== undefined) r.tag            = c.tag;
  if (c.discom        !== undefined) r.discom         = c.discom;
  if (c.circle        !== undefined) r.circle         = c.circle;
  if (c.division      !== undefined) r.division       = c.division;
  if (c.subDivision   !== undefined) r.sub_division   = c.subDivision;
  if (c.password      !== undefined) r.password       = c.password;
  return r;
}

export async function fetchCustomerById(id: number): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return fromDB(data);
}

export async function fetchCustomerByCustomerId(customerId: string): Promise<Customer | null> {
  const norm = (s: string) => s.replace(/^(ASPL-?)0*(\d+)$/i, "ASPL-$2");
  const { data, error } = await supabase.from("customers").select("*");
  if (error) return null;
  const found = (data ?? []).find(row => norm(row.customer_id ?? "") === norm(customerId));
  return found ? fromDB(found) : null;
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromDB);
}

export async function fetchCustomersByIds(customerIds: string[]): Promise<Customer[]> {
  if (customerIds.length === 0) return [];
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .in("customer_id", customerIds);
  if (error) throw error;
  return (data ?? []).map(fromDB);
}

// Surya Gujarat scheme customers are handled entirely outside this CRM's stage
// pipeline — treat them as already complete and exclude them from every Kanban board.
export function isGujaratSchemeCustomer(c: Pick<Customer, "scheme">): boolean {
  return !!c.scheme && c.scheme.trim().toUpperCase().startsWith("SURYA GUJARAT");
}

export async function createCustomer(
  c: Omit<Customer, "id" | "customerId">,
): Promise<Customer> {
  // Auto-set password to phone number if not provided
  const payload = { ...c, password: c.password || c.phone };
  const { data, error } = await supabase
    .from("customers")
    .insert(toDB(payload))
    .select()
    .single();
  if (error) throw error;
  return fromDB(data);
}

export async function loginCustomer(phone: string, password: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .eq("password", password)
    .single();
  if (error || !data) return null;
  return fromDB(data);
}

export async function updateCustomer(
  id: number,
  updates: Partial<Omit<Customer, "id" | "customerId">>,
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update(toDB(updates))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDB(data);
}

export async function updateCustomerName(customerId: string, name: string): Promise<void> {
  const { error } = await supabase.from("customers").update({ name }).eq("customer_id", customerId);
  if (error) throw error;
}

export async function deleteCustomer(id: number): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}
