import { HTMLAttributes } from "react";

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-zinc-200 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 ${props.className ?? ""}`}
    />
  );
}
