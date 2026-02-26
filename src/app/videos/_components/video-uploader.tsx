"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VideoUploader() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/videos", { method: "POST", body });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(json?.error ?? "업로드 실패");
      setUploading(false);
      return;
    }

    setMessage("암호화 업로드 완료");
    form.reset();
    setUploading(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          name="file"
          type="file"
          accept="video/*"
          required
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-white dark:file:bg-zinc-100 dark:file:text-zinc-900"
        />
        <button
          disabled={uploading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {uploading ? "업로드 중..." : "암호화 업로드"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{message}</p> : null}
    </form>
  );
}
