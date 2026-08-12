import { supabase } from "./supabase";

export type ActivityCategory = "Page Visit" | "Login" | "Action";

export type EmployeeActivity = {
  id:           string;
  employeeId:   string;
  employeeName: string;
  action:       string;
  page:         string | null;
  category:     ActivityCategory;
  loggedAt:     string;
};

function fromDB(row: Record<string, unknown>): EmployeeActivity {
  return {
    id:           row.id            as string,
    employeeId:   row.employee_id   as string,
    employeeName: row.employee_name as string,
    action:       row.action        as string,
    page:         row.page          as string | null,
    category:     row.category      as ActivityCategory,
    loggedAt:     row.logged_at     as string,
  };
}

export async function fetchActivities(limit = 300): Promise<EmployeeActivity[]> {
  const { data, error } = await supabase
    .from("employee_activities")
    .select("*")
    .order("logged_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(fromDB);
}

export async function logPageVisit(
  employeeId: string,
  employeeName: string,
  pageName: string,
  page: string,
): Promise<void> {
  await supabase.from("employee_activities").insert({
    employee_id:   employeeId,
    employee_name: employeeName,
    action:        `Viewed ${pageName}`,
    page,
    category:      "Page Visit",
  });
}

export async function logLogin(employeeId: string, employeeName: string): Promise<void> {
  await supabase.from("employee_activities").insert({
    employee_id:   employeeId,
    employee_name: employeeName,
    action:        "Logged in",
    page:          "/login",
    category:      "Login",
  });
}

export async function logAction(
  employeeId: string,
  employeeName: string,
  action: string,
  page?: string,
): Promise<void> {
  await supabase.from("employee_activities").insert({
    employee_id:   employeeId,
    employee_name: employeeName,
    action,
    page:          page ?? null,
    category:      "Action",
  });
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from("employee_activities").delete().eq("id", id);
  if (error) throw error;
}

export async function clearAllActivities(): Promise<void> {
  const { error } = await supabase.from("employee_activities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}
