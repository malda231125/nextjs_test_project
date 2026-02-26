"use client";

import { createClient } from "@/lib/supabase/client";
import { decryptVideoBrowser, encryptVideoBrowser } from "@/lib/video-crypto-browser";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type VideoRow = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  iv: string;
  auth_tag: string;
  created_at: string;
};

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_VIDEO_BUCKET ?? "encrypted-videos";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function SecureVideoManager({ userId, initialVideos }: { userId: string; initialVideos: VideoRow[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [passphrase, setPassphrase] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;
    if (!passphrase || passphrase.length < 6) {
      setMessage("복호화 비밀번호를 6자 이상 입력해주세요.");
      return;
    }

    try {
      setUploading(true);
      setMessage(null);
      const plain = await file.arrayBuffer();
      const { encrypted, iv, authTag, algorithm } = await encryptVideoBrowser(plain, userId, passphrase);

      const id = crypto.randomUUID();
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const storagePath = `${userId}/${id}.${ext}.enc`;

      const up = await supabase.storage.from(BUCKET).upload(storagePath, encrypted, {
        contentType: "application/octet-stream",
        upsert: false,
      });

      if (up.error) throw up.error;

      const ins = await supabase.from("videos").insert({
        id,
        user_id: userId,
        filename: file.name,
        mime_type: file.type || "video/mp4",
        size_bytes: file.size,
        storage_path: storagePath,
        iv,
        auth_tag: authTag,
        algorithm,
      });
      if (ins.error) throw ins.error;

      setMessage("암호화 업로드 완료");
      form.reset();
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "업로드 실패";
      setMessage(`업로드 실패: ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  async function playVideo(v: VideoRow) {
    if (!passphrase || passphrase.length < 6) {
      setMessage("재생 전 복호화 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setPlayingId(v.id);
      setMessage(null);

      if (blobUrls[v.id]) return;

      const dl = await supabase.storage.from(BUCKET).download(v.storage_path);
      if (dl.error || !dl.data) throw dl.error ?? new Error("download failed");

      const encrypted = new Uint8Array(await dl.data.arrayBuffer());
      const decrypted = await decryptVideoBrowser(encrypted, userId, passphrase, v.iv, v.auth_tag);
      const blob = new Blob([decrypted], { type: v.mime_type || "video/mp4" });
      const url = URL.createObjectURL(blob);
      setBlobUrls((prev) => ({ ...prev, [v.id]: url }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "복호화 실패";
      setMessage(`재생 실패: ${msg}`);
    } finally {
      setPlayingId(null);
    }
  }

  return (
    <>
      <form onSubmit={onUpload} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-3 md:grid-cols-[1fr_240px_auto] md:items-center">
          <input
            name="file"
            type="file"
            accept="video/*"
            required
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-white dark:file:bg-zinc-100 dark:file:text-zinc-900"
          />
          <input
            type="password"
            placeholder="복호화 비밀번호 (6자+)"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <button disabled={uploading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {uploading ? "업로드 중..." : "암호화 업로드"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">※ 비밀번호를 잊으면 복호화할 수 없습니다.</p>
        {message ? <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-200">{message}</p> : null}
      </form>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">내 영상 목록</h2>
        {initialVideos.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-zinc-500">아직 업로드한 영상이 없습니다.</div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {initialVideos.map((v) => (
              <li key={v.id} className="min-w-0 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="truncate font-medium">{v.filename}</p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(v.created_at).toLocaleString()}</p>
                <p className="mt-1 break-all text-xs text-zinc-500">{v.mime_type} · {formatBytes(v.size_bytes ?? 0)}</p>

                {!blobUrls[v.id] ? (
                  <button
                    onClick={() => playVideo(v)}
                    disabled={playingId === v.id}
                    className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {playingId === v.id ? "복호화 중..." : "복호화 후 재생"}
                  </button>
                ) : (
                  <video className="mt-3 w-full rounded-lg border bg-black" controls preload="metadata" src={blobUrls[v.id]} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
