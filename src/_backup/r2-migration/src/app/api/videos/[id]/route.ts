import { deleteEncryptedObject } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: video, error } = await supabase
    .from("videos")
    .select("id, user_id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await deleteEncryptedObject(video.storage_path);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Storage delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const del = await supabase.from("videos").delete().eq("id", id).eq("user_id", user.id);
  if (del.error) {
    return NextResponse.json({ error: del.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
