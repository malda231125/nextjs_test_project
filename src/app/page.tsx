import { createClient } from "@/lib/supabase/server";
import { signOut } from "./auth/actions";
import Link from "next/link";

const services = [
  {
    title: "Secure Video Vault",
    desc: "로그인 사용자 전용 암호화 영상 업로드/목록/재생",
    href: "/videos",
    badge: "Live",
  },
  {
    title: "Auth Center",
    desc: "이메일 로그인/회원가입 + 접근 제어",
    href: "/auth/login",
    badge: "Live",
  },
  {
    title: "Review Intelligence",
    desc: "리뷰 기반 인사이트 생성 (예정)",
    href: "#",
    badge: "Soon",
  },
  {
    title: "Trend Radar",
    desc: "플랫폼별 트렌드 신호 집계 (예정)",
    href: "#",
    badge: "Soon",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-zinc-100 to-zinc-200 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-8">
        <header className="mb-12 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">OpenClaw Product Hub</p>
            <h1 className="mt-2 text-2xl font-bold">Next Product Landing</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <>
                <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                  {user.email}
                </span>
                <form action={signOut}>
                  <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                    로그아웃
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  로그인
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
            <p className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
              Modular Product Platform
            </p>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              하나의 베이스,
              <br />
              계속 확장되는 서비스들
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              이 프로젝트는 신규 프로덕트를 빠르게 붙이기 위한 메인 허브입니다.
              인증, 보안 저장소, API, UI 패턴을 공통으로 두고 서비스 단위를 지속 확장합니다.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/videos"
                className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                보안 영상 서비스 바로가기
              </Link>
              <Link
                href="/auth/login"
                className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                계정 시작하기
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">현재 상태</p>
              <p className="mt-1 text-lg font-semibold">Core Infrastructure Ready</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Auth + Supabase + Encrypted Storage + Protected Routes</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">확장 전략</p>
              <p className="mt-1 text-lg font-semibold">Service-by-Service Rollout</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">공통 레이아웃/컴포넌트 기반으로 신규 제품 모듈만 추가</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-5 flex items-end justify-between">
          <h3 className="text-2xl font-bold">서비스 카탈로그</h3>
          <p className="text-xs text-zinc-500">지속 업데이트 예정</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {services.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-lg font-semibold">{item.title}</h4>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    item.badge === "Live"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {item.badge}
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{item.desc}</p>
              {item.href !== "#" ? (
                <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:underline">
                  이동하기 →
                </Link>
              ) : (
                <p className="mt-4 text-sm font-semibold text-zinc-400">준비 중</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
