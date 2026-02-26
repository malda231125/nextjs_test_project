import { LabelHTMLAttributes } from "react";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={`text-sm font-medium text-zinc-700 dark:text-zinc-200 ${props.className ?? ""}`}
    />
  );
}
