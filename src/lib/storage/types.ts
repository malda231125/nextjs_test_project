export type StorageProviderKind = "r2" | "supabase-backup";

export type SignedUploadTarget = {
  provider: StorageProviderKind;
  storagePath: string;
  uploadUrl: string;
  requiredHeaders?: Record<string, string>;
  expiresInSeconds: number;
};

export type SignedDownloadTarget = {
  provider: StorageProviderKind;
  storagePath: string;
  downloadUrl: string;
  expiresInSeconds: number;
};
