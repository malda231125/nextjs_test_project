import Link from "next/link";
import { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  message,
  children,
  altHref,
  altLabel,
}: {
  title: string;
  subtitle: string;
  message?: string;
  children: ReactNode;
  altHref: string;
  altLabel: string;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 px-6 py-12 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-md">
        <div className="mb-5 text-center">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{subtitle}</p>
        </div>

        {children}

        {message ? (
          <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {message}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
          <Link href={altHref} className="font-medium text-blue-600 hover:underline">
            {altLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
