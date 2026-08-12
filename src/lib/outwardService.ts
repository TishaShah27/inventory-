import { supabase } from "./supabase";
import type { OutwardEntry } from "@/data/inventoryStore";
import { upsertInstallerPartnerStock } from "./installerInventoryService";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDB(row: any): OutwardEntry {
  return {
    id: String(row.id),
    challanDate: row.challan_date ?? "",
    billNumber: row.bill_number ?? "",
    concernedPerson: row.concerned_person ?? "",
    deliveryTo: row.delivery_to ?? "B2C",
    b2bCompanyName: row.b2b_company_name ?? undefined,
    customerAddress: row.customer_address ?? "",
    deliveryCity: row.delivery_city ?? "",
    gstDetails: row.gst_details ?? "",
    driverName: row.driver_name ?? "",
    driverContact: row.driver_contact ?? "",
    remarks: row.remarks ?? "",
    vehicleNo: row.vehicle_no ?? "",
    deliveryContact: row.delivery_contact ?? "",
    subcategoryId: String(row.subcategory_id),
    qty: row.qty ?? 0,
    serialNos: row.serial_nos ?? [],
  };
}

export async function fetchOutwardEntries(): Promise<OutwardEntry[]> {
  const { data, error } = await supabase
    .from("inventory_outward")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromDB);
}

export async function createOutwardEntry(
  e: OutwardEntry,
  supplierType: "b2b" | "b2i" = "b2b",
  installerPartnerId?: string,
  installerPartnerName?: string,
): Promise<void> {
  const { error: insErr } = await supabase.from("inventory_outward").insert({
    id: e.id,
    challan_date: e.challanDate,
    bill_number: e.billNumber,
    concerned_person: e.concernedPerson,
    delivery_to: e.deliveryTo,
    b2b_company_name: e.b2bCompanyName ?? null,
    customer_address: e.customerAddress,
    delivery_city: e.deliveryCity,
    gst_details: e.gstDetails,
    driver_name: e.driverName,
    driver_contact: e.driverContact,
    remarks: e.remarks,
    vehicle_no: e.vehicleNo,
    delivery_contact: e.deliveryContact,
    subcategory_id: Number(e.subcategoryId),
    qty: e.qty,
    serial_nos: e.serialNos,
  });
  if (insErr) throw insErr;

  const { data: sub, error: fetchErr } = await supabase
    .from("inventory_subcategories")
    .select("godown_stock")
    .eq("id", Number(e.subcategoryId))
    .single();
  if (fetchErr) throw fetchErr;

  // Outward always deducts from godown (godown perspective)
  const { error: updErr } = await supabase
    .from("inventory_subcategories")
    .update({ godown_stock: Math.max(0, (sub?.godown_stock ?? 0) - e.qty) })
    .eq("id", Number(e.subcategoryId));
  if (updErr) throw updErr;

  if (supplierType === "b2i" && installerPartnerId) {
    // Installer outward: godown sends to installer partner → installer partner stock increases
    await upsertInstallerPartnerStock(
      installerPartnerId,
      installerPartnerName ?? installerPartnerId,
      e.subcategoryId,
      e.qty,
    );
  }
}
