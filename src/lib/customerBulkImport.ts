import * as XLSX from "xlsx";
import { type Customer } from "@/data/customersStore";

export type CustomerImportColumn = {
  key: string;
  header: string;
  required?: boolean;
  example: string;
};

// Column order here is the column order in the downloaded template.
export const CUSTOMER_IMPORT_COLUMNS: CustomerImportColumn[] = [
  { key: "customerType", header: "Customer Type (New/Old)", example: "New" },
  { key: "scheme", header: "Scheme", example: "PM SURYA GHAR" },
  { key: "name", header: "Name*", required: true, example: "Sharma Residence" },
  { key: "consumerNo", header: "Consumer No.", example: "MH-PNE-00112" },
  { key: "source", header: "Source", example: "Firoz Siddiqui" },
  { key: "finance", header: "Finance (SELF/SOLFIN/BAJAJ/JAN SAMARTH)", example: "SELF" },
  { key: "aadhaarCard", header: "Aadhaar Card No.", example: "" },
  { key: "phone", header: "Contact No.*", required: true, example: "9876543210" },
  { key: "email", header: "Email", example: "email@example.com" },
  { key: "phase", header: "Phase Type (Single/Three)*", required: true, example: "Single" },
  { key: "address", header: "Address", example: "12 MG Road" },
  { key: "pincode", header: "Pin Code", example: "411004" },
  { key: "city", header: "City*", required: true, example: "Pune" },
  { key: "capacity", header: "System Capacity (kW)*", required: true, example: "5.49" },
  { key: "wp", header: "Wp (Watt Peak)", example: "580" },
  { key: "numPanels", header: "No. of Panels", example: "10" },
  { key: "panelBrand", header: "Panel Make", example: "Waaree" },
  { key: "inverterBrand", header: "Inverter Make", example: "Growatt" },
  { key: "inverterKw", header: "Inverter KW", example: "5" },
  { key: "type", header: "Installation Type (On-grid/Off-grid/Hybrid)", example: "On-grid" },
  { key: "paid", header: "Total Cost (Rs.)", example: "266000" },
  { key: "warrantyStartDate", header: "Warranty Start Date (YYYY-MM-DD)", example: "" },
  { key: "discom", header: "Discom", example: "PGVCL" },
  { key: "circle", header: "Circle", example: "" },
  { key: "division", header: "Division", example: "" },
  { key: "subDivision", header: "Sub-Division", example: "" },
  { key: "notes", header: "Notes", example: "" },
];

export function downloadCustomerTemplate() {
  const headers = CUSTOMER_IMPORT_COLUMNS.map((c) => c.header);
  const example = CUSTOMER_IMPORT_COLUMNS.map((c) => c.example);
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = CUSTOMER_IMPORT_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");
  XLSX.writeFile(wb, "customer_bulk_upload_template.xlsx");
}

const CUSTOMER_EXPORT_COLUMNS: { header: string; get: (c: Customer) => string }[] = [
  { header: "Customer ID", get: (c) => c.customerId },
  { header: "Name", get: (c) => c.name },
  { header: "Tag", get: (c) => c.tag ?? "" },
  { header: "Customer Type", get: (c) => c.customerType ?? "" },
  { header: "Contact No.", get: (c) => c.phone },
  { header: "Email", get: (c) => c.email },
  { header: "Address", get: (c) => c.address ?? "" },
  { header: "City", get: (c) => c.city },
  { header: "Pin Code", get: (c) => c.pincode ?? "" },
  { header: "Capacity (kW)", get: (c) => c.capacity },
  { header: "Status", get: (c) => c.status },
  { header: "Installation Type", get: (c) => c.type },
  { header: "Finance", get: (c) => c.finance ?? "" },
  { header: "Source", get: (c) => c.source ?? "" },
  { header: "Scheme", get: (c) => c.scheme ?? "" },
  { header: "Consumer No.", get: (c) => c.consumerNo ?? "" },
  { header: "Total Cost (Rs.)", get: (c) => c.paid },
  { header: "Discom", get: (c) => c.discom ?? "" },
  { header: "Circle", get: (c) => c.circle ?? "" },
  { header: "Division", get: (c) => c.division ?? "" },
  { header: "Sub-Division", get: (c) => c.subDivision ?? "" },
  { header: "Since", get: (c) => c.since },
  { header: "Notes", get: (c) => c.notes ?? "" },
];

export function exportCustomersToExcel(rows: Customer[]) {
  const headers = CUSTOMER_EXPORT_COLUMNS.map((c) => c.header);
  const data = rows.map((r) => CUSTOMER_EXPORT_COLUMNS.map((c) => c.get(r)));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws["!cols"] = CUSTOMER_EXPORT_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");
  XLSX.writeFile(wb, `customers_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export type ParsedCustomerRow = Record<string, string>;

// Reads the uploaded template back, keyed by our internal field names rather
// than the human-readable header text so the header row must stay as downloaded.
export async function parseCustomerFile(file: File): Promise<ParsedCustomerRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  const headerToKey = new Map(CUSTOMER_IMPORT_COLUMNS.map((c) => [c.header, c.key]));

  return raw
    .map((row) => {
      const out: ParsedCustomerRow = {};
      for (const [header, value] of Object.entries(row)) {
        const key = headerToKey.get(header.trim());
        if (key) out[key] = String(value ?? "").trim();
      }
      return out;
    })
    .filter((row) => Object.values(row).some((v) => v !== ""));
}
