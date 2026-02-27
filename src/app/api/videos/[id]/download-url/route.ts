import { createSignedDownloadTarget } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
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
    const target = await createSignedDownloadTarget(video.storage_path);
    return NextResponse.json(target);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create download URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
