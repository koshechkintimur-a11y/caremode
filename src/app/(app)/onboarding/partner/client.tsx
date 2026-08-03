"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PARTNER_QUESTIONS, type PartnerProfile } from "@/lib/partnerContext";
import { cn } from "@/lib/utils";

// Микро-опрос партнёра: 3 вопроса по 10 секунд, тап = автопереход, скип внизу.
export function PartnerSurvey() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function skip() {
    router.push("/instruction");
  }

  async function pick(key: string, id: string) {
    if (busy) return;
    const next = { ...answers, [key]: id };
    setAnswers(next);

    if (step < PARTNER_QUESTIONS.length - 1) {
      // автопереход через 250мс
      setTimeout(() => setStep((s) => s + 1), 250);
      return;
    }

    // финал: сохраняем и идём на инструкцию
    setBusy(true);
    try {
      const res = await fetch("/api/profile/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        router.push("/instruction");
        return;
      }
    } catch {}
    setBusy(false);
  }

  const q = PARTNER_QUESTIONS[step];

  return (
    <div className="w-full max-w-md flex flex-col gap-8">
      {/* прогресс */}
      <div className="flex items-center justify-center gap-2">
        {PARTNER_QUESTIONS.map((_, i) => (
          <span
            key={i}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-colors",
              i === step ? "bg-xp" : i < step ? "bg-success" : "bg-line"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6"
        >
          <h1 className="text-[24px] font-extrabold text-ink leading-tight">{q.title}</h1>

          <div className="flex flex-col gap-3">
            {q.options.map((o) => (
              <motion.button
                key={o.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => pick(q.key, o.id)}
                className="rounded-[20px] bg-surface border-2 border-line p-4 text-left flex items-center gap-4 transition-colors hover:border-primary/50"
              >
                <span className="text-[24px]">{o.emoji}</span>
                <span className="text-[15px] font-extrabold text-ink">{o.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={skip}
        disabled={busy}
        className="self-center text-[13px] font-bold text-muted underline decoration-dotted underline-offset-4 disabled:opacity-50"
      >
        {busy ? "Собираем твой профиль…" : "Пропустить — разберёмся по ходу"}
      </button>
    </div>
  );
}

export type { PartnerProfile };
