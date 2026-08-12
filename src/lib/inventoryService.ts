import { supabase } from "./supabase";
import type { Master, Group, Category, Subcategory } from "@/data/inventoryStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function masterFromDB(row: any): Master {
  return { id: String(row.id), name: row.name ?? "", unit: row.unit ?? "NOS" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupFromDB(row: any): Group {
  return { id: String(row.id), masterId: String(row.master_id), name: row.name ?? "" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function catFromDB(row: any): Category {
  return { id: String(row.id), groupId: String(row.group_id), name: row.name ?? "" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function subFromDB(row: any): Subcategory {
  const godownStock = row.godown_stock ?? 0;
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    name: row.name ?? "",
    stock: godownStock,
    godownStock,
  };
}

export async function fetchAllInventory() {
  const [mastersRes, groupsRes, catsRes, subsRes] = await Promise.all([
    supabase.from("inventory_masters").select("*").order("id", { ascending: true }),
    supabase.from("inventory_groups").select("*").order("id", { ascending: true }),
    supabase.from("inventory_categories").select("*").order("id", { ascending: true }),
    supabase.from("inventory_subcategories").select("*").order("id", { ascending: true }),
  ]);

  if (mastersRes.error) throw mastersRes.error;
  if (groupsRes.error) throw groupsRes.error;
  if (catsRes.error) throw catsRes.error;
  if (subsRes.error) throw subsRes.error;

  return {
    masters: (mastersRes.data ?? []).map(masterFromDB),
    groups: (groupsRes.data ?? []).map(groupFromDB),
    cats: (catsRes.data ?? []).map(catFromDB),
    subs: (subsRes.data ?? []).map(subFromDB),
  };
}

export async function createMaster(name: string, unit: string): Promise<void> {
  const { error } = await supabase.from("inventory_masters").insert({ name, unit });
  if (error) throw error;
}

export async function updateMaster(id: string, name: string, unit: string): Promise<void> {
  const { error } = await supabase.from("inventory_masters").update({ name, unit }).eq("id", id);
  if (error) throw error;
}

export async function deleteMaster(id: string): Promise<void> {
  const { error } = await supabase.from("inventory_masters").delete().eq("id", id);
  if (error) throw error;
}

export async function createGroup(masterId: string, name: string): Promise<void> {
  const { error } = await supabase.from("inventory_groups").insert({ master_id: masterId, name });
  if (error) throw error;
}

export async function updateGroup(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("inventory_groups").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from("inventory_groups").delete().eq("id", id);
  if (error) throw error;
}

export async function createCategory(groupId: string, name: string): Promise<void> {
  const { error } = await supabase.from("inventory_categories").insert({ group_id: groupId, name });
  if (error) throw error;
}

export async function updateCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("inventory_categories").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("inventory_categories").delete().eq("id", id);
  if (error) throw error;
}

export async function createSubcategory(categoryId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("inventory_subcategories")
    .insert({ category_id: categoryId, name, godown_stock: 0 });
  if (error) throw error;
}

export async function updateSubcategory(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("inventory_subcategories")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSubcategory(id: string): Promise<void> {
  const { error } = await supabase.from("inventory_subcategories").delete().eq("id", id);
  if (error) throw error;
}
