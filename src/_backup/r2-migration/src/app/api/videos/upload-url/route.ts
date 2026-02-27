import { createSignedUploadTarget } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  const filename = body?.filename;
  const contentType = body?.contentType;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }

  const ext = filename.includes(".") ? filename.split(".").pop() ?? "bin" : "bin";

  try {
    const target = await createSignedUploadTarget({
      userId: user.id,
      id,
      ext,
      contentType: contentType || "application/octet-stream",
    });

    return NextResponse.json(target);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
