"use client";

import { createClient } from "@/lib/supabase/client";
import { decryptVideoBrowser, encryptVideoBrowser } from "@/lib/video-crypto-browser";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";

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

const BUCKET = (process.env.NEXT_PUBLIC_SUPABASE_VIDEO_BUCKET ?? "encrypted-videos").trim();
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const MAX_UPLOAD_MB = Number((process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? "1024").trim());
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

async function uploadWithTus(params: {
  file: File;
  objectPath: string;
  accessToken: string;
  onProgress?: (percent: number) => void;
}) {
  const endpoint = `${SUPABASE_URL}/storage/v1/upload/resumable`;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(params.file, {
      endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      chunkSize: 6 * 1024 * 1024,
      removeFingerprintOnSuccess: true,
      uploadDataDuringCreation: true,
      metadata: {
        bucketName: BUCKET,
        objectName: params.objectPath,
        contentType: "application/octet-stream",
      },
      headers: {
        authorization: `Bearer ${params.accessToken}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
        "x-upsert": "false",
      },
      onError: (error) => {
        const e = error as unknown as {
          message?: string;
          originalResponse?: { getStatus?: () => number; getBody?: () => string };
          originalRequest?: { getMethod?: () => string; getURL?: () => string };
        };

        const status = e.originalResponse?.getStatus?.();
        const body = e.originalResponse?.getBody?.();
        const method = e.originalRequest?.getMethod?.();
        const url = e.originalRequest?.getURL?.();
        const detail = [
          e.message,
          method && url ? `request: ${method} ${url}` : null,
          status ? `status: ${status}` : null,
          body ? `response: ${body}` : null,
        ]
          .filter(Boolean)
          .join(" | ");

        reject(new Error(detail || "TUS upload failed"));
      },
      onProgress: (uploaded, total) => {
        if (params.onProgress && total > 0) {
          params.onProgress(Math.round((uploaded / total) * 100));
        }
      },
      onSuccess: () => resolve(),
    });

    upload.start();
  });
}

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setMessage(`업로드 실패: 파일이 너무 큽니다. 현재 제한은 ${MAX_UPLOAD_MB}MB 입니다.`);
      return;
    }
    if (!passphrase || passphrase.length < 6) {
      setMessage("복호화 비밀번호를 6자 이상 입력해주세요.");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setMessage(null);
      const plain = await file.arrayBuffer();
      const { encrypted, iv, authTag, algorithm } = await encryptVideoBrowser(plain, userId, passphrase);

      const id = crypto.randomUUID();
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const storagePath = `${userId}/${id}.${ext}.enc`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
      }

      const encryptedFile = new File([encrypted], `${id}.enc`, {
        type: "application/octet-stream",
      });

      await uploadWithTus({
        file: encryptedFile,
        objectPath: storagePath,
        accessToken: session.access_token,
        onProgress: setUploadProgress,
      });

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
      setUploadProgress(0);
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
            {uploading ? `업로드 중... ${uploadProgress}%` : "암호화 업로드"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">※ 비밀번호를 잊으면 복호화할 수 없습니다. 업로드 제한: {MAX_UPLOAD_MB}MB</p>
        {message ? <p className="mt-3 break-all text-sm text-zinc-700 dark:text-zinc-200">{message}</p> : null}

        <details className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800/30">
          <summary className="cursor-pointer font-semibold">업로드 디버그 정보</summary>
          <ul className="mt-2 space-y-1 break-all text-zinc-600 dark:text-zinc-300">
            <li>bucket: {BUCKET}</li>
            <li>endpoint: {SUPABASE_URL}/storage/v1/upload/resumable</li>
            <li>maxUploadMB: {MAX_UPLOAD_MB}</li>
            <li>userId: {userId}</li>
          </ul>
        </details>
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
