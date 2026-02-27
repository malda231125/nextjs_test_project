import { downloadEncryptedObject } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { decryptVideo } from "@/lib/video-crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: video, error } = await supabase
    .from("videos")
    .select("id, user_id, filename, mime_type, storage_path, iv, auth_tag")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !video) return new Response("Not found", { status: 404 });

  let encrypted: Buffer;
  try {
    encrypted = Buffer.from(await downloadEncryptedObject(video.storage_path));
  } catch {
    return new Response("Storage download failed", { status: 500 });
  }
  let decrypted: Buffer;
  try {
    decrypted = decryptVideo(encrypted, user.id, video.iv, video.auth_tag);
  } catch {
    return new Response("Decrypt failed", { status: 500 });
  }

  return new Response(new Uint8Array(decrypted), {
    status: 200,
    headers: {
      "Content-Type": video.mime_type || "video/mp4",
      "Content-Length": String(decrypted.byteLength),
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename=\"${video.filename}\"`,
    },
  });
}
