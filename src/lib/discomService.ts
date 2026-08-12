import { supabase } from "./supabase";

export type Discom = {
  id: string;
  discom: string;
  circle: string;
  division: string;
  subDivision: string;
  createdAt: string;
};

export type DiscomInput = {
  discom: string;
  circle: string;
  division: string;
  subDivision: string;
};

function fromDB(row: Record<string, unknown>): Discom {
  return {
    id: row.id as string,
    discom: row.discom as string,
    circle: row.circle as string,
    division: row.division as string,
    subDivision: row.sub_division as string,
    createdAt: row.created_at as string,
  };
}

function toDB(row: DiscomInput) {
  return {
    discom: row.discom,
    circle: row.circle,
    division: row.division,
    sub_division: row.subDivision,
  };
}

export async function fetchDiscoms(): Promise<Discom[]> {
  const { data, error } = await supabase
    .from("discoms")
    .select("*")
    .order("discom", { ascending: true });
  if (error) return [];
  return (data ?? []).map(fromDB);
}

export async function addDiscom(row: DiscomInput): Promise<void> {
  const { error } = await supabase.from("discoms").insert(toDB(row));
  if (error) throw error;
}

export async function addDiscomsBulk(rows: DiscomInput[]): Promise<void> {
  const valid = rows.filter(
    (r) => r.discom.trim() && r.circle.trim() && r.division.trim() && r.subDivision.trim(),
  );
  if (!valid.length) return;
  const { error } = await supabase.from("discoms").upsert(valid.map(toDB), {
    onConflict: "discom,circle,division,sub_division",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

export async function deleteDiscom(id: string): Promise<void> {
  const { error } = await supabase.from("discoms").delete().eq("id", id);
  if (error) throw error;
}
