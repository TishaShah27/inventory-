import { supabase } from "./supabase";
import type { InstallerPartnerStock } from "@/data/inventoryStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDB(row: any): InstallerPartnerStock {
  return {
    id: String(row.id),
    installerPartnerId: String(row.b2i_partner_id),
    installerPartnerName: row.b2i_partner_name ?? "",
    subcategoryId: String(row.subcategory_id),
    qty: row.qty ?? 0,
  };
}

export async function fetchInstallerPartnerStock(
  installerPartnerId?: string,
): Promise<InstallerPartnerStock[]> {
  let query = supabase.from("b2i_partner_inventory").select("*");
  if (installerPartnerId) query = query.eq("b2i_partner_id", installerPartnerId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(fromDB);
}

export async function upsertInstallerPartnerStock(
  installerPartnerId: string,
  installerPartnerName: string,
  subcategoryId: string,
  deltaqty: number,
): Promise<void> {
  const { data: existing } = await supabase
    .from("b2i_partner_inventory")
    .select("id, qty")
    .eq("b2i_partner_id", installerPartnerId)
    .eq("subcategory_id", Number(subcategoryId))
    .maybeSingle();

  if (existing) {
    const newQty = Math.max(0, existing.qty + deltaqty);
    const { error } = await supabase
      .from("b2i_partner_inventory")
      .update({ qty: newQty, b2i_partner_name: installerPartnerName })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    if (deltaqty <= 0) return;
    const { error } = await supabase.from("b2i_partner_inventory").insert({
      b2i_partner_id: installerPartnerId,
      b2i_partner_name: installerPartnerName,
      subcategory_id: Number(subcategoryId),
      qty: deltaqty,
    });
    if (error) throw error;
  }
}
