"use client";

import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import Link from "next/link";

// Заглушка подписки: задел на ЮKassa/Lava (фаза 5). Роут уже в навигации.
export function PaywallPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md flex flex-col items-center gap-6 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center mt-8">
        <Gift size={28} className="text-primary" />
      </div>
      <div>
        <h1 className="font-pixel text-[16px] text-ink leading-relaxed">Подписка скоро</h1>
        <p className="text-[14px] font-semibold text-muted mt-3 leading-relaxed max-w-[300px]">
          Пока всё бесплатно: персональные ИИ-подсказки, навигатор цикла и сертификаты заботы.
          Платная подписка появится после первых живых пар — и сразу будет честной: глубина, а не базовая забота.
        </p>
      </div>
      <Link
        href="/today"
        className="h-[52px] px-8 rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[15px] flex items-center gap-2 shadow-[0_8px_24px_rgba(232,131,127,.4)] active:scale-[.97] transition"
      >
        Вернуться к подсказке
      </Link>
    </motion.div>
  );
}
