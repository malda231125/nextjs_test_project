import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SecureVideoManager } from "./_components/secure-video-manager";

export default async function VideosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/auth?message=${encodeURIComponent("로그인 후 이용해주세요.")}`);

  const { data: videos } = await supabase
    .from("videos")
    .select("id, filename, mime_type, size_bytes, storage_path, iv, auth_tag, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">🔐 Secure Video Vault</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">업로드 시 암호화되어 Supabase Storage에 저장됩니다.</p>
        </div>
        <Link href="/" className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900">
          홈으로
        </Link>
      </div>

      <SecureVideoManager userId={user.id} initialVideos={(videos ?? []) as never} />
    </main>
  );
}
