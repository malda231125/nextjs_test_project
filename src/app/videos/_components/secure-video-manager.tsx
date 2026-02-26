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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (files.length === 0) return;
    if (!passphrase || passphrase.length < 6) {
      setMessage("복호화 비밀번호를 6자 이상 입력해주세요.");
      return;
    }

    const tooBig = files.find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      setMessage(`업로드 실패: ${tooBig.name} 파일이 너무 큽니다. 현재 제한은 ${MAX_UPLOAD_MB}MB 입니다.`);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
      }

      let doneCount = 0;
      for (const file of files) {
        const plain = await file.arrayBuffer();
        const { encrypted, iv, authTag, algorithm } = await encryptVideoBrowser(plain, userId, passphrase);

        const id = crypto.randomUUID();
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
        const storagePath = `${userId}/${id}.${ext}.enc`;

        const encryptedFile = new File([encrypted], `${id}.enc`, {
          type: "application/octet-stream",
        });

        await uploadWithTus({
          file: encryptedFile,
          objectPath: storagePath,
          accessToken: session.access_token,
          onProgress: (p) => {
            const overall = Math.floor(((doneCount + p / 100) / files.length) * 100);
            setUploadProgress(overall);
          },
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

        doneCount += 1;
        setUploadProgress(Math.floor((doneCount / files.length) * 100));
      }

      setMessage(`암호화 업로드 완료 (${files.length}개)`);
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

  async function onDeleteVideo(video: VideoRow) {
    if (confirmText !== video.filename) {
      setMessage("삭제 확인 실패: 파일명을 정확히 입력해주세요.");
      return;
    }

    try {
      setMessage(null);

      const rm = await supabase.storage.from(BUCKET).remove([video.storage_path]);
      if (rm.error) throw rm.error;

      const del = await supabase.from("videos").delete().eq("id", video.id).eq("user_id", userId);
      if (del.error) throw del.error;

      if (blobUrls[video.id]) {
        URL.revokeObjectURL(blobUrls[video.id]);
        setBlobUrls((prev) => {
          const cp = { ...prev };
          delete cp[video.id];
          return cp;
        });
      }

      setDeletingId(null);
      setConfirmText("");
      setMessage(`삭제 완료: ${video.filename}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "삭제 실패";
      setMessage(`삭제 실패: ${msg}`);
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
            multiple
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
        <p className="mt-2 text-xs text-zinc-500">※ 비밀번호를 잊으면 복호화할 수 없습니다. 업로드 제한: {MAX_UPLOAD_MB}MB / 파일</p>
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

                <div className="mt-3 flex flex-wrap gap-2">
                  {!blobUrls[v.id] ? (
                    <button
                      onClick={() => playVideo(v)}
                      disabled={playingId === v.id}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {playingId === v.id ? "복호화 중..." : "복호화 후 재생"}
                    </button>
                  ) : null}

                  <button
                    onClick={() => {
                      setDeletingId(v.id);
                      setConfirmText("");
                    }}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
                  >
                    삭제
                  </button>
                </div>

                {blobUrls[v.id] ? (
                  <video className="mt-3 w-full rounded-lg border bg-black" controls preload="metadata" src={blobUrls[v.id]} />
                ) : null}

                {deletingId === v.id ? (
                  <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm dark:border-rose-800 dark:bg-rose-900/20">
                    <p className="font-semibold text-rose-700 dark:text-rose-300">삭제 확인</p>
                    <p className="mt-1 text-xs text-rose-700/90 dark:text-rose-300/90">
                      실수 방지를 위해 아래에 파일명을 정확히 입력하세요:
                    </p>
                    <p className="mt-1 break-all rounded bg-white px-2 py-1 text-xs dark:bg-zinc-900">{v.filename}</p>
                    <input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="파일명 입력"
                      className="mt-2 w-full rounded border px-2 py-1 text-xs"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => onDeleteVideo(v)}
                        disabled={confirmText !== v.filename}
                        className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        최종 삭제
                      </button>
                      <button
                        onClick={() => {
                          setDeletingId(null);
                          setConfirmText("");
                        }}
                        className="rounded border px-3 py-1.5 text-xs"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
