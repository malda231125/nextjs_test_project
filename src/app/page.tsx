import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-6 py-20">
      <h1 className="text-3xl font-bold">Next.js + Supabase 연결 완료 ✅</h1>
      <p className="text-zinc-600 dark:text-zinc-300">
        현재 로그인 사용자: {user?.email ?? "로그인되지 않음"}
      </p>
      <div className="rounded-lg border p-4 text-sm">
        <p className="font-semibold">다음 단계</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>.env.local에 Supabase URL/Anon Key 추가</li>
          <li>Supabase Auth 설정</li>
          <li>로그인/회원가입 페이지 구현</li>
        </ol>
      </div>
    </main>
  );
}
