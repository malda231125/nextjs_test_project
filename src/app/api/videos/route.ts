import { createClient } from "@/lib/supabase/server";
import { encryptVideo } from "@/lib/video-crypto";
import { NextResponse } from "next/server";

const BUCKET = process.env.SUPABASE_VIDEO_BUCKET ?? "encrypted-videos";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("videos")
    .select("id, filename, mime_type, size_bytes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ videos: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!file.type.startsWith("video/")) {
    return NextResponse.json({ error: "Only video files are allowed" }, { status: 400 });
  }

  const plainBuffer = Buffer.from(await file.arrayBuffer());
  const { encrypted, iv, tag, algorithm } = encryptVideo(plainBuffer, user.id);

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const id = crypto.randomUUID();
  const storagePath = `${user.id}/${id}.${ext}.enc`;

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, encrypted, {
      contentType: "application/octet-stream",
      upsert: false,
    });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const insert = await supabase.from("videos").insert({
    id,
    user_id: user.id,
    filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    storage_path: storagePath,
    iv,
    auth_tag: tag,
    algorithm,
  });

  if (insert.error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insert.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
