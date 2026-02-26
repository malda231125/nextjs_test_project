import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { signOut } from "./auth/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-6 py-20">
      <h1 className="text-3xl font-bold">Next.js + Supabase Auth ✅</h1>

      <p className="text-zinc-600 dark:text-zinc-300">
        현재 로그인 사용자: {user?.email ?? "로그인되지 않음"}
      </p>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/auth/login"
          className="rounded border px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          로그인/회원가입 페이지
        </Link>

        {user ? (
          <>
            <Link
              href="/videos"
              className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
            >
              보안 영상 보관함
            </Link>
            <form action={signOut}>
              <button className="rounded bg-black px-3 py-2 text-sm text-white dark:bg-white dark:text-black">
                로그아웃
              </button>
            </form>
          </>
        ) : null}
      </div>

      <div className="rounded-lg border p-4 text-sm">
        <p className="font-semibold">환경변수 체크</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
          <li>NEXT_PUBLIC_SITE_URL (예: https://your-app.vercel.app)</li>
        </ol>
      </div>
    </main>
  );
}
