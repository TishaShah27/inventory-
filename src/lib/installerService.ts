import { supabase } from "./supabase";
import type { B2bPartner } from "@/data/inventoryStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDB(row: any): B2bPartner {
  return {
    id: String(row.id),
    companyName: row.company_name ?? "",
    gstin: row.gstin ?? "",
    address: row.address ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    pincode: row.pincode ?? "",
    contact: row.contact ?? "",
    installerType: row.installer_type ?? undefined,
  };
}

function toDB(data: Omit<B2bPartner, "id">) {
  return {
    company_name: data.companyName,
    gstin: data.gstin,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    contact: data.contact,
    installer_type: data.installerType ?? null,
  };
}

export async function fetchInstallerPartners(): Promise<B2bPartner[]> {
  const { data, error } = await supabase
    .from("b2i_partners")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromDB);
}

export async function fetchInstallerById(id: string): Promise<B2bPartner | null> {
  const { data, error } = await supabase.from("b2i_partners").select("*").eq("id", id).single();
  if (error) return null;
  return fromDB(data);
}

export async function createInstallerPartner(data: Omit<B2bPartner, "id">): Promise<B2bPartner> {
  const { data: row, error } = await supabase
    .from("b2i_partners")
    .insert(toDB(data))
    .select()
    .single();
  if (error) throw error;
  return fromDB(row);
}

export async function updateInstallerPartner(
  id: string,
  data: Omit<B2bPartner, "id">,
): Promise<B2bPartner> {
  const { data: row, error } = await supabase
    .from("b2i_partners")
    .update(toDB(data))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDB(row);
}

export async function deleteInstallerPartner(id: string): Promise<void> {
  const { error } = await supabase.from("b2i_partners").delete().eq("id", id);
  if (error) throw error;
}
