import { supabase } from "./supabase";

export type LeadSource = {
  id: string;
  name: string;
  createdAt: string;
};

function fromDB(row: Record<string, unknown>): LeadSource {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
  };
}

export async function fetchSources(): Promise<LeadSource[]> {
  const { data, error } = await supabase
    .from("lead_sources")
    .select("*")
    .order("name", { ascending: true });
  if (error) return [];
  return (data ?? []).map(fromDB);
}

export async function addSource(name: string): Promise<void> {
  const { error } = await supabase
    .from("lead_sources")
    .upsert({ name }, { onConflict: "name", ignoreDuplicates: true });
  if (error) throw error;
}

export async function addSourcesBulk(names: string[]): Promise<void> {
  const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  if (!unique.length) return;
  const { error } = await supabase.from("lead_sources").upsert(
    unique.map((name) => ({ name })),
    { onConflict: "name", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function updateSource(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("lead_sources").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteSource(id: string): Promise<void> {
  const { error } = await supabase.from("lead_sources").delete().eq("id", id);
  if (error) throw error;
}
