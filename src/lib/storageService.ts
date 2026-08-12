import { supabase } from "./supabase";

const BUCKET = "customer-docs";

export async function uploadCustomerDoc(
  customerId: string,
  folder: string,
  fieldName: string,
  file: File,
): Promise<string> {
  const path = `${customerId}/${folder}/${fieldName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteCustomerDoc(
  customerId: string,
  folder: string,
  fieldName: string,
): Promise<void> {
  const path = `${customerId}/${folder}/${fieldName}`;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export function getDocPublicUrl(
  customerId: string,
  folder: string,
  fieldName: string,
): string {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`${customerId}/${folder}/${fieldName}`);
  return data.publicUrl;
}
