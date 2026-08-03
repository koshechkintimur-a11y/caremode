"use client";

import { motion } from "framer-motion";
import { Gift } from "lucide-react";

// Заглушка пейволла — подписка появится после подключения ЮKassa.
export function PaywallCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className="w-full max-w-md rounded-[28px] bg-surface p-8 text-center shadow-[0_16px_48px_rgba(232,131,127,.18)]"
    >
      <div className="mx-auto w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center">
        <Gift size={28} className="text-primary" />
      </div>
      <h2 className="mt-5 text-[22px] font-extrabold text-ink">Бесплатные карточки закончились</h2>
      <p className="mt-2 text-[15px] font-semibold text-muted leading-relaxed">
        Дальше — подписка: неограниченные подсказки и твой личный «переводчик эмпатии».
        Оплата появится совсем скоро — мы уже пилим.
      </p>
      <div className="mt-6 rounded-2xl bg-bg p-4 text-[13px] font-bold text-muted">
        Скоро · 249 ₽/мес или 1 490 ₽/год
      </div>
    </motion.div>
  );
}
