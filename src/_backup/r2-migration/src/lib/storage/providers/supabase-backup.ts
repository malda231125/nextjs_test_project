import { createClient } from "@/lib/supabase/server";
import { SignedDownloadTarget } from "../types";

// Backup provider that preserves the original Supabase Storage path.
const BUCKET = process.env.SUPABASE_VIDEO_BUCKET ?? "encrypted-videos";
const DOWNLOAD_TTL = Number(process.env.SUPABASE_SIGNED_DOWNLOAD_TTL_SECONDS ?? "120");

export function isSupabaseBackupPath(storagePath: string) {
  return !storagePath.startsWith("r2:");
}

export async function createSupabaseSignedDownloadUrl(storagePath: string): Promise<SignedDownloadTarget> {
  const supabase = await createClient();
  const result = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, DOWNLOAD_TTL);

  if (result.error || !result.data?.signedUrl) {
    throw new Error(result.error?.message ?? "Failed to create Supabase signed URL");
  }

  return {
    provider: "supabase-backup",
    storagePath,
    downloadUrl: result.data.signedUrl,
    expiresInSeconds: DOWNLOAD_TTL,
  };
}

export async function downloadSupabaseObject(storagePath: string): Promise<Uint8Array> {
  const supabase = await createClient();
  const dl = await supabase.storage.from(BUCKET).download(storagePath);
  if (dl.error || !dl.data) {
    throw new Error(dl.error?.message ?? "Supabase storage download failed");
  }

  return new Uint8Array(await dl.data.arrayBuffer());
}

export async function deleteSupabaseObject(storagePath: string): Promise<void> {
  const supabase = await createClient();
  const rm = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (rm.error) {
    throw new Error(rm.error.message);
  }
}
