"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

// Кольцо прогресса стреака — анимированный stroke-dashoffset
export function StreakRing({ streak, size = 64 }: { streak: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.min(streak / 7, 1); // полное кольцо = 7 дней
  const offset = c * (1 - target);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary-soft)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <Flame size={18} className={streak > 0 ? "text-primary" : "text-muted/50"} />
        <span className="text-[15px] font-extrabold text-ink mt-0.5">{streak}</span>
      </div>
    </div>
  );
}
