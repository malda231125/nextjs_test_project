import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VideoUploader } from "./_components/video-uploader";

async function getVideos() {
  const supabase = await createClient();
  const { data: videos } = await supabase
    .from("videos")
    .select("id, filename, mime_type, size_bytes, created_at")
    .order("created_at", { ascending: false });

  return videos ?? [];
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export default async function VideosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth?message=로그인 후 이용해주세요.");

  const videos = await getVideos();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">🔐 Secure Video Vault</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            업로드 시 암호화되어 Supabase Storage에 저장됩니다.
          </p>
        </div>
        <Link href="/" className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900">
          홈으로
        </Link>
      </div>

      <VideoUploader />

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">내 영상 목록</h2>
        {videos.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-zinc-500">
            아직 업로드한 영상이 없습니다.
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {videos.map((v) => (
              <li key={v.id} className="rounded-2xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="line-clamp-1 font-medium">{v.filename}</p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(v.created_at).toLocaleString()}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {v.mime_type} · {formatBytes(v.size_bytes ?? 0)}
                </p>

                <video
                  className="mt-3 w-full rounded-lg border bg-black"
                  controls
                  preload="metadata"
                  src={`/api/videos/${v.id}/stream`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
