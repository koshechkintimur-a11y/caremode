"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

// Стрелка назад: показываем на внутренних экранах (кроме флоу онбординга).
// router.back() с фолбэком на /today, если истории нет.
export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/today" || pathname === "/onboarding") return null;

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/today");
      }}
      className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center active:scale-95 transition shrink-0"
      aria-label="Назад"
    >
      <ChevronLeft size={20} className="text-ink" />
    </button>
  );
}
