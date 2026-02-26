const enc = new TextEncoder();

function getSalt(userId: string) {
  const extra = process.env.NEXT_PUBLIC_VIDEO_KDF_SALT ?? "openclaw-video-salt";
  return enc.encode(`${userId}:${extra}`);
}

async function deriveKey(userId: string, passphrase: string) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: getSalt(userId),
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function toB64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromB64(input: string) {
  const binary = atob(input);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function encryptVideoBrowser(fileBuffer: ArrayBuffer, userId: string, passphrase: string) {
  const key = await deriveKey(userId, passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedWithTag = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, fileBuffer)
  );

  const tag = encryptedWithTag.slice(encryptedWithTag.length - 16);
  const encrypted = encryptedWithTag.slice(0, encryptedWithTag.length - 16);

  return {
    encrypted,
    iv: toB64(iv),
    authTag: toB64(tag),
    algorithm: "aes-256-gcm",
  };
}

export async function decryptVideoBrowser(
  encrypted: Uint8Array,
  userId: string,
  passphrase: string,
  ivB64: string,
  tagB64: string
) {
  const key = await deriveKey(userId, passphrase);
  const iv = fromB64(ivB64);
  const tag = fromB64(tagB64);
  const combined = new Uint8Array(encrypted.length + tag.length);
  combined.set(encrypted, 0);
  combined.set(tag, encrypted.length);

  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  return new Uint8Array(plain);
}
