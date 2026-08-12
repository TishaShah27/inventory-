import { supabase } from "./supabase";
import type { B2bPartner } from "@/data/inventoryStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDB(row: any): B2bPartner {
  return {
    id:          String(row.id),
    companyName: row.company_name ?? "",
    gstin:       row.gstin        ?? "",
    address:     row.address      ?? "",
    city:        row.city         ?? "",
    state:       row.state        ?? "",
    pincode:     row.pincode      ?? "",
    contact:     row.contact      ?? "",
  };
}

function toDB(data: Omit<B2bPartner, "id">) {
  return {
    company_name: data.companyName,
    gstin:        data.gstin,
    address:      data.address,
    city:         data.city,
    state:        data.state,
    pincode:      data.pincode,
    contact:      data.contact,
  };
}

export async function fetchB2bPartners(): Promise<B2bPartner[]> {
  const { data, error } = await supabase
    .from("b2b_partners")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromDB);
}

export async function fetchB2bById(id: string): Promise<B2bPartner | null> {
  const { data, error } = await supabase
    .from("b2b_partners")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return fromDB(data);
}

export async function createB2bPartner(data: Omit<B2bPartner, "id">): Promise<B2bPartner> {
  const { data: row, error } = await supabase
    .from("b2b_partners")
    .insert(toDB(data))
    .select()
    .single();
  if (error) throw error;
  return fromDB(row);
}

export async function updateB2bPartner(id: string, data: Omit<B2bPartner, "id">): Promise<B2bPartner> {
  const { data: row, error } = await supabase
    .from("b2b_partners")
    .update(toDB(data))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDB(row);
}

export async function deleteB2bPartner(id: string): Promise<void> {
  const { error } = await supabase.from("b2b_partners").delete().eq("id", id);
  if (error) throw error;
}
