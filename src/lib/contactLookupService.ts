import { supabase } from "./supabase";

export type ContactOwner = {
  role: string;
  name: string;
};

// Checks whether a contact number is already used as a login ID by any
// employee (any role, including Source User) or any customer.
export async function findContactOwner(contactNo: string): Promise<ContactOwner | null> {
  const trimmed = contactNo.trim();
  if (!trimmed) return null;

  const { data: emp } = await supabase
    .from("employees")
    .select("name, role")
    .eq("contact_no", trimmed)
    .maybeSingle();
  if (emp) return { role: (emp.role as string) ?? "Employee", name: emp.name as string };

  const { data: cust } = await supabase
    .from("customers")
    .select("name")
    .eq("phone", trimmed)
    .maybeSingle();
  if (cust) return { role: "Customer", name: cust.name as string };

  return null;
}

export function contactOwnerMessage(owner: ContactOwner): string {
  return `This number already exists as ${owner.role} "${owner.name}"`;
}
