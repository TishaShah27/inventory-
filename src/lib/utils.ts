import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Some legacy rows have "₹" prefixed more than once — collapse to exactly one.
export function formatRupee(value: string | null | undefined) {
  const digits = (value ?? "").replace(/₹/g, "").trim();
  return `₹${digits || "0"}`;
}

// Same dedupe as formatRupee, but preserves "no value entered" as "" instead of forcing "₹0".
export function dedupeRupeeSymbol(value: string | null | undefined): string {
  const raw = value ?? "";
  const digits = raw.replace(/₹/g, "").trim();
  return digits ? `₹${digits}` : "";
}

// Strip any ₹ the user typed so the raw number is what gets stored — display layers
// (formatRupee / dedupeRupeeSymbol) add the symbol back on read, so it never doubles up.
export function stripRupeeSymbol(value: string | null | undefined): string {
  return (value ?? "").replace(/₹/g, "").trim();
}

// DC Capacity (kW) = Wp × No. of Panels / 1000. Not user-editable — derived and stored
// alongside the manually-entered System Capacity, shown only on the customer view page.
export function computeDcCapacity(wp: string, numPanels: string): string {
  const wpNum = parseFloat(wp);
  const panels = parseFloat(numPanels);
  if (isNaN(wpNum) || isNaN(panels) || panels <= 0) return "";
  return parseFloat(((wpNum * panels) / 1000).toFixed(3)).toString();
}

// "2026-07-14" + 5 -> "2031-07-14"
export function addYearsIso(iso: string, years: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

// Calendar-accurate countdown to a warranty end date, e.g. "4Y 3M 21D".
export function formatWarrantyRemaining(endIso: string | null | undefined): string {
  if (!endIso) return "—";
  const end = new Date(endIso + "T00:00:00");
  if (isNaN(end.getTime())) return "—";

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (end <= now) return "Expired";

  let years = end.getFullYear() - now.getFullYear();
  let months = end.getMonth() - now.getMonth();
  let days = end.getDate() - now.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}Y`);
  if (months > 0) parts.push(`${months}M`);
  if (days > 0 || parts.length === 0) parts.push(`${days}D`);
  return parts.join(" ");
}
