import { signInWithEmail, signUpWithEmail } from "./actions";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-20">
      <h1 className="text-2xl font-bold">이메일 로그인 / 회원가입</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        같은 이메일/비밀번호로 가입 후 로그인할 수 있어요.
      </p>

      <form action={signInWithEmail} className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-semibold">로그인</h2>
        <input
          name="email"
          type="email"
          required
          placeholder="email@example.com"
          className="rounded border px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="비밀번호 (6자 이상)"
          className="rounded border px-3 py-2"
        />
        <button className="rounded bg-black px-3 py-2 text-white dark:bg-white dark:text-black">
          로그인
        </button>
      </form>

      <form action={signUpWithEmail} className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-semibold">회원가입</h2>
        <input
          name="email"
          type="email"
          required
          placeholder="email@example.com"
          className="rounded border px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="비밀번호 (6자 이상)"
          className="rounded border px-3 py-2"
        />
        <button className="rounded bg-blue-600 px-3 py-2 text-white">회원가입</button>
      </form>

      {message ? (
        <p className="rounded border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </p>
      ) : null}
    </main>
  );
}
