import {
  buildR2ObjectKey,
  createR2SignedDownloadUrl,
  createR2SignedUploadUrl,
  deleteR2Object,
  downloadR2Object,
  isR2StoragePath,
} from "./providers/r2";
import {
  createSupabaseSignedDownloadUrl,
  deleteSupabaseObject,
  downloadSupabaseObject,
} from "./providers/supabase-backup";

export { isR2StoragePath, buildR2ObjectKey };

export async function createSignedUploadTarget(params: {
  userId: string;
  id: string;
  ext: string;
  contentType?: string;
}) {
  const objectKey = buildR2ObjectKey(params.userId, params.id, params.ext);
  return createR2SignedUploadUrl({
    objectKey,
    contentType: params.contentType,
  });
}

export async function createSignedDownloadTarget(storagePath: string) {
  if (isR2StoragePath(storagePath)) {
    return createR2SignedDownloadUrl(storagePath);
  }

  return createSupabaseSignedDownloadUrl(storagePath);
}

export async function downloadEncryptedObject(storagePath: string) {
  if (isR2StoragePath(storagePath)) {
    return downloadR2Object(storagePath);
  }

  return downloadSupabaseObject(storagePath);
}

export async function deleteEncryptedObject(storagePath: string) {
  if (isR2StoragePath(storagePath)) {
    return deleteR2Object(storagePath);
  }

  return deleteSupabaseObject(storagePath);
}
