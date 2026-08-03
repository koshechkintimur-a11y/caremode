"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full h-[52px] rounded-2xl bg-surface border border-line px-4 text-[16px] font-semibold text-ink placeholder:text-muted/70 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition",
        className
      )}
      {...rest}
    />
  );
}
