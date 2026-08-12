import { supabase } from "./supabase";

export const EMPLOYEE_ROLES = [
  "Action Staff",
  "Service Staff",
  "Admin Staff",
  "Back Office Staff",
  "Source User",
] as const;

export type EmployeeRole = typeof EMPLOYEE_ROLES[number];

export type Employee = {
  id:        string;
  name:      string;
  contactNo: string;
  password:  string;
  role:      EmployeeRole | null;
  source:    string | null;
  createdAt: string;
};

// Always-available demo admin — works before any Supabase table is set up
const DEMO_ADMIN: Employee = {
  id:        "demo-admin",
  name:      "Solar Admin",
  contactNo: "9999999999",
  password:  "Admin@123",
  role:      "Admin Staff",
  source:    null,
  createdAt: new Date().toISOString(),
};

function fromDB(row: Record<string, unknown>): Employee {
  return {
    id:        row.id        as string,
    name:      row.name      as string,
    contactNo: row.contact_no as string,
    password:  row.password  as string,
    role:      (row.role as EmployeeRole) ?? null,
    source:    (row.source as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return [DEMO_ADMIN];
  return [DEMO_ADMIN, ...(data ?? []).map(fromDB)];
}

export async function addEmployee(
  name: string,
  contactNo: string,
  password: string,
  role: EmployeeRole | null,
  source?: string,
): Promise<void> {
  const { error } = await supabase
    .from("employees")
    .insert({ name, contact_no: contactNo, password, role, source: source ?? null });
  if (error) {
    if (error.code === "23505") throw new Error("Contact number already exists.");
    throw new Error(error.message);
  }
}

export async function updateEmployee(id: string, name: string, password: string, role: EmployeeRole | null): Promise<void> {
  const { error } = await supabase
    .from("employees")
    .update({ name, password, role })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw error;
}

export async function loginEmployee(contactNo: string, password: string): Promise<Employee | null> {
  if (contactNo === DEMO_ADMIN.contactNo && password === DEMO_ADMIN.password) return DEMO_ADMIN;
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("contact_no", contactNo)
    .eq("password", password)
    .single();
  if (error || !data) return null;
  return fromDB(data);
}

// ── Session helpers (localStorage) ────────────────────────────────────────────

export function getSession(): Employee | null {
  try {
    return JSON.parse(localStorage.getItem("crm_employee") ?? "null");
  } catch {
    return null;
  }
}

export function saveSession(employee: Employee): void {
  localStorage.setItem("crm_employee", JSON.stringify(employee));
}

export function clearSession(): void {
  localStorage.removeItem("crm_employee");
}

// ── Source User access helpers ─────────────────────────────────────────────────

export function isSourceUser(): boolean {
  return getSession()?.role === "Source User";
}

// ── Field Staff (Action / Service) access helpers ──────────────────────────────

export function isFieldStaff(): boolean {
  const role = getSession()?.role;
  return role === "Action Staff" || role === "Service Staff";
}

export function getSourceFilter(): string | null {
  const s = getSession();
  return s?.role === "Source User" ? (s.source ?? null) : null;
}
