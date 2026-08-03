"use client";

import { motion } from "framer-motion";
import { Pause } from "lucide-react";

// Режим инкогнито: нейтральная карточка БЕЗ причин и дат.
export function PauseCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className="w-full max-w-md rounded-[28px] bg-surface p-8 text-center shadow-[0_16px_48px_rgba(232,131,127,.14)]"
    >
      <div className="mx-auto w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center">
        <Pause size={26} className="text-primary" />
      </div>
      <h2 className="mt-5 text-[22px] font-extrabold text-ink">Она взяла паузу</h2>
      <p className="mt-2 text-[15px] font-semibold text-muted leading-relaxed">
        Это нормально. Подсказки вернутся, когда она будет готова.
        Твоя задача сейчас — просто быть рядом, без вопросов.
      </p>
    </motion.div>
  );
}
