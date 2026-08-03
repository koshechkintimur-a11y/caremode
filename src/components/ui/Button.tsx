"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "soft" | "ghost" | "danger" | "success";

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-primary to-accent text-white shadow-[0_8px_24px_rgba(232,131,127,.35)] hover:shadow-[0_10px_32px_rgba(232,131,127,.45)]",
  soft: "bg-primary-soft text-primary hover:brightness-95",
  ghost: "bg-transparent text-ink border border-line hover:bg-surface",
  danger: "bg-danger/10 text-danger hover:bg-danger/15",
  success: "bg-success text-white shadow-[0_8px_24px_rgba(127,169,143,.35)]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  full?: boolean;
}

// Tap-фидбек через CSS active:scale — без framer-motion (проще и lint-чисто)
export function Button({ variant = "primary", children, full, className, ...rest }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 h-[52px] text-[15px] font-bold select-none transition-transform active:scale-[.97]",
        styles[variant],
        full && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
