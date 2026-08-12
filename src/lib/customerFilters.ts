import { type Customer } from "@/data/customersStore";

export type CustomerFilters = {
  source: string;
  phase: "" | "single" | "three";
  city: string;
  kwMin: string;
  kwMax: string;
  wpMin: string;
  wpMax: string;
  panelsMin: string;
  panelsMax: string;
  panelBrand: string;
  inverterBrand: string;
  inverterKwMin: string;
  inverterKwMax: string;
  pdc: "" | "Yes" | "No";
  installType: string;
  discom: string;
  circle: string;
  division: string;
  subDivision: string;
  // Kanban card order within each stage column — not a row filter, so it's
  // excluded from countActiveFilters/customerMatchesFilters.
  sortOrder: "latest" | "oldest";
};

export const emptyCustomerFilters: CustomerFilters = {
  source: "",
  phase: "",
  city: "",
  kwMin: "",
  kwMax: "",
  wpMin: "",
  wpMax: "",
  panelsMin: "",
  panelsMax: "",
  panelBrand: "",
  inverterBrand: "",
  inverterKwMin: "",
  inverterKwMax: "",
  pdc: "",
  installType: "",
  discom: "",
  circle: "",
  division: "",
  subDivision: "",
  sortOrder: "latest",
};

export function parseNum(s?: string) {
  const n = parseFloat((s ?? "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

export function uniqueValues(rows: Customer[], getter: (r: Customer) => string | undefined) {
  return Array.from(new Set(rows.map((r) => (getter(r) ?? "").trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function withAllOption(values: string[], allLabel: string) {
  return [{ value: "__all__", label: allLabel }, ...values.map((v) => ({ value: v, label: v }))];
}

export function customerMatchesFilters(r: Customer, filters: CustomerFilters): boolean {
  if (filters.source && r.source !== filters.source) return false;
  if (filters.phase === "single" && r.singlePhase !== true) return false;
  if (filters.phase === "three" && r.singlePhase !== false) return false;
  if (filters.city && r.city !== filters.city) return false;

  const kw = parseNum(r.capacity);
  if (filters.kwMin && (kw === null || kw < parseFloat(filters.kwMin))) return false;
  if (filters.kwMax && (kw === null || kw > parseFloat(filters.kwMax))) return false;

  const wp = parseNum(r.wp);
  if (filters.wpMin && (wp === null || wp < parseFloat(filters.wpMin))) return false;
  if (filters.wpMax && (wp === null || wp > parseFloat(filters.wpMax))) return false;

  const panels = parseNum(r.numPanels);
  if (filters.panelsMin && (panels === null || panels < parseFloat(filters.panelsMin))) return false;
  if (filters.panelsMax && (panels === null || panels > parseFloat(filters.panelsMax))) return false;

  if (filters.panelBrand && r.panelBrand !== filters.panelBrand) return false;
  if (filters.inverterBrand && r.inverterBrand !== filters.inverterBrand) return false;

  const invKw = parseNum(r.inverterKw);
  if (filters.inverterKwMin && (invKw === null || invKw < parseFloat(filters.inverterKwMin)))
    return false;
  if (filters.inverterKwMax && (invKw === null || invKw > parseFloat(filters.inverterKwMax)))
    return false;

  if (filters.pdc && r.pdcFacilityGiven !== filters.pdc) return false;
  if (filters.installType && r.type !== filters.installType) return false;
  if (filters.discom && r.discom !== filters.discom) return false;
  if (filters.circle && r.circle !== filters.circle) return false;
  if (filters.division && r.division !== filters.division) return false;
  if (filters.subDivision && r.subDivision !== filters.subDivision) return false;
  return true;
}

export function countActiveFilters(filters: CustomerFilters) {
  return Object.entries(filters).filter(([k, v]) => k !== "sortOrder" && v !== "").length;
}
