"use client";

import { motion } from "framer-motion";
import { Sparkles, Check, ThumbsDown, Share2, Loader2 } from "lucide-react";
import { StreakRing } from "@/components/StreakRing";

export type FeedbackKind = "GOOD" | "MISSED" | "BAD";

export function DailyCard({
  text,
  streak,
  busy,
  source = "AI",
  onGood,
  onBad,
  onShare,
}: {
  text: string;
  streak: number;
  busy: boolean;
  source?: "AI" | "FALLBACK";
  onGood: () => void;
  onBad: () => void;
  onShare: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-gradient-to-br from-primary/80 via-[#E98F8B]/75 to-accent/80 p-7 pt-6 text-white shadow-[0_16px_48px_rgba(232,131,127,.3)] backdrop-blur-[16px]"
      >
        {/* мягкие блики */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-center justify-between">
          <span
            className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/90"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,.5)" }}
          >
            Твоя подсказка на сегодня
          </span>
          <button
            onClick={onShare}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="Поделиться"
          >
            <Share2 size={16} className="text-white" />
          </button>
        </div>

        <p
          className="relative mt-6 text-[21px] font-extrabold leading-snug tracking-tight"
          style={{ textShadow: "0 2px 14px rgba(0,0,0,.55)" }}
        >
          {text}
        </p>

        <div className="relative mt-8 flex items-center gap-2 text-[13px] font-bold text-white/85">
          <Sparkles size={14} className="text-white/90" />
          {source === "AI" ? "Персональная подсказка" : "Кураторская подборка"}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-3"
      >
        <button
          onClick={onGood}
          disabled={busy}
          className="flex-1 h-[54px] rounded-full bg-success text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(127,169,143,.35)] active:scale-[.97] transition disabled:opacity-50"
        >
          <Check size={18} strokeWidth={3} />
          Сделал
        </button>
        <button
          onClick={onBad}
          disabled={busy}
          className="h-[54px] px-5 rounded-full bg-surface border border-line text-ink font-bold text-[15px] flex items-center gap-2 active:scale-[.97] transition disabled:opacity-50"
        >
          <ThumbsDown size={17} className="text-muted" />
          Не то
        </button>
      </motion.div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <StreakRing streak={streak} />
          <div className="leading-tight">
            <div className="text-[14px] font-extrabold text-ink">Серия заботы</div>
            <div className="text-[12px] font-semibold text-muted">
              {streak > 0 ? `${streak} ${streak === 1 ? "день" : "дня"} подряд — огонь` : "начни сегодня"}
            </div>
          </div>
        </div>
        {busy && <Loader2 size={20} className="text-primary animate-spin" />}
      </div>
    </div>
  );
}
