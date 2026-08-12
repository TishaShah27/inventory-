import { supabase } from "./supabase";
import type { InwardEntry } from "@/data/inventoryStore";
import { upsertInstallerPartnerStock } from "./installerInventoryService";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDB(row: any): InwardEntry {
  return {
    id: String(row.id),
    inwardId: row.inward_id ?? "",
    entryType: row.entry_type ?? "New Materials",
    invoiceDate: row.invoice_date ?? "",
    materialReceivedDate: row.material_received_date ?? "",
    billNumber: row.bill_number ?? "",
    supplier: row.supplier ?? "",
    supplierType: row.supplier_type ?? "b2b",
    subcategoryId: String(row.subcategory_id),
    qty: row.qty ?? 0,
    gstPct: row.gst_pct ?? 18,
    price: row.price ?? 0,
    serialNos: row.serial_nos ?? [],
  };
}

export async function fetchInwardEntries(): Promise<InwardEntry[]> {
  const { data, error } = await supabase
    .from("inventory_inward")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromDB);
}

export async function createInwardEntry(
  e: InwardEntry,
  installerPartnerId?: string,
): Promise<void> {
  const { error: insErr } = await supabase.from("inventory_inward").insert({
    id: e.id,
    inward_id: e.inwardId,
    entry_type: e.entryType,
    invoice_date: e.invoiceDate,
    material_received_date: e.materialReceivedDate,
    bill_number: e.billNumber,
    supplier: e.supplier,
    supplier_type: e.supplierType,
    subcategory_id: Number(e.subcategoryId),
    qty: e.qty,
    gst_pct: e.gstPct,
    price: e.price,
    serial_nos: e.serialNos,
  });
  if (insErr) throw insErr;

  const { data: sub, error: fetchErr } = await supabase
    .from("inventory_subcategories")
    .select("godown_stock")
    .eq("id", Number(e.subcategoryId))
    .single();
  if (fetchErr) throw fetchErr;

  // Inward always adds to godown (godown perspective)
  const { error: updErr } = await supabase
    .from("inventory_subcategories")
    .update({ godown_stock: (sub?.godown_stock ?? 0) + e.qty })
    .eq("id", Number(e.subcategoryId));
  if (updErr) throw updErr;

  if (e.supplierType === "b2i") {
    // Installer inward: godown receives from installer partner → installer partner stock decreases
    await upsertInstallerPartnerStock(
      installerPartnerId ?? e.supplier,
      e.supplier,
      e.subcategoryId,
      -e.qty,
    );
  }
}

export async function fetchMaxInwardSeq(): Promise<number> {
  const { data } = await supabase
    .from("inventory_inward")
    .select("inward_id")
    .order("created_at", { ascending: false })
    .limit(200);
  if (!data || data.length === 0) return 1620;
  const nums = (data as { inward_id: string }[])
    .map((r) => r.inward_id)
    .filter(Boolean)
    .map((s) => parseInt(s.replace("IN/", ""), 10))
    .filter((n) => !isNaN(n));
  return nums.length > 0 ? Math.max(...nums) + 1 : 1620;
}
