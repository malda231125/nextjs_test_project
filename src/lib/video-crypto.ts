import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(userId: string) {
  const secret = process.env.VIDEO_ENCRYPTION_SECRET;
  if (!secret) throw new Error("Missing VIDEO_ENCRYPTION_SECRET");
  return createHash("sha256").update(`${secret}:${userId}`).digest();
}

export function encryptVideo(buffer: Buffer, userId: string) {
  const iv = randomBytes(12);
  const key = getKey(userId);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    algorithm: ALGO,
  };
}

export function decryptVideo(encrypted: Buffer, userId: string, ivB64: string, tagB64: string) {
  const key = getKey(userId);
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
