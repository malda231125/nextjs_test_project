import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SignedDownloadTarget, SignedUploadTarget } from "../types";

const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID ?? "";
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "";
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "";
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET ?? "encrypted-videos";
const PREFIX = (process.env.CLOUDFLARE_R2_KEY_PREFIX ?? "videos").replace(/^\/+|\/+$/g, "");
const DOWNLOAD_TTL = Number(process.env.CLOUDFLARE_R2_DOWNLOAD_TTL_SECONDS ?? "120");
const UPLOAD_TTL = Number(process.env.CLOUDFLARE_R2_UPLOAD_TTL_SECONDS ?? "300");

function assertConfigured() {
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
    throw new Error("Cloudflare R2 env is not fully configured");
  }
}

function getClient() {
  assertConfigured();

  return new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });
}

export function isR2StoragePath(storagePath: string) {
  return storagePath.startsWith("r2:");
}

export function toR2StoragePath(objectKey: string) {
  return `r2:${objectKey}`;
}

export function fromR2StoragePath(storagePath: string) {
  return storagePath.replace(/^r2:/, "");
}

export function buildR2ObjectKey(userId: string, id: string, ext: string) {
  const cleanedExt = ext.replace(/[^a-zA-Z0-9]/g, "") || "bin";
  return `${PREFIX}/${userId}/${id}.${cleanedExt}.enc`;
}

export async function createR2SignedUploadUrl(params: {
  objectKey: string;
  contentType?: string;
}): Promise<SignedUploadTarget> {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: params.objectKey,
    ContentType: params.contentType ?? "application/octet-stream",
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: UPLOAD_TTL,
  });

  return {
    provider: "r2",
    storagePath: toR2StoragePath(params.objectKey),
    uploadUrl,
    requiredHeaders: {
      "content-type": params.contentType ?? "application/octet-stream",
    },
    expiresInSeconds: UPLOAD_TTL,
  };
}

export async function createR2SignedDownloadUrl(storagePath: string): Promise<SignedDownloadTarget> {
  const objectKey = fromR2StoragePath(storagePath);
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
  });

  const downloadUrl = await getSignedUrl(client, command, {
    expiresIn: DOWNLOAD_TTL,
  });

  return {
    provider: "r2",
    storagePath,
    downloadUrl,
    expiresInSeconds: DOWNLOAD_TTL,
  };
}

export async function downloadR2Object(storagePath: string): Promise<Uint8Array> {
  const objectKey = fromR2StoragePath(storagePath);
  const client = getClient();
  const data = await client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
    })
  );

  if (!data.Body) {
    throw new Error("R2 object body is empty");
  }

  const bytes = await data.Body.transformToByteArray();
  return bytes;
}

export async function deleteR2Object(storagePath: string): Promise<void> {
  const objectKey = fromR2StoragePath(storagePath);
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
    })
  );
}
