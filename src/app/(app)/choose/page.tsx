"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Heart, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

// Выбор пути для новичка без пары (после OAuth/регистрации):
// создать пару (заполнить послание) или ввести код партнёра.
export default function ChoosePage() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm"
    >
      <h1 className="text-[24px] font-extrabold text-ink">Кто ты в этой паре?</h1>
      <p className="text-[14px] font-semibold text-muted mt-1 mb-6">
        От этого зависит, что ты увидишь
      </p>

      <div className="grid gap-3">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push("/onboarding")}
          className={cn(
            "rounded-3xl p-5 text-left transition-colors border-2 border-primary bg-primary-soft"
          )}
        >
          <Heart size={22} className="text-primary" />
          <div className="mt-3 text-[15px] font-extrabold text-ink">Я создаю пару</div>
          <div className="text-[12px] font-semibold text-muted mt-1 leading-snug">
            Настрою послание и приглашу партнёра
          </div>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push("/join")}
          className={cn(
            "rounded-3xl p-5 text-left transition-colors border-2 border-line bg-surface"
          )}
        >
          <KeyRound size={22} className="text-muted" />
          <div className="mt-3 text-[15px] font-extrabold text-ink">У меня есть код</div>
          <div className="text-[12px] font-semibold text-muted mt-1 leading-snug">
            Мне прислали приглашение — я вхожу в пару
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}
