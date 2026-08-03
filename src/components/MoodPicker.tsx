"use client";

import { motion } from "framer-motion";
import { CloudRain, Cloud, Sun, Sunrise, type LucideIcon } from "lucide-react";
import { MOODS } from "@/lib/careOptions";
import { cn } from "@/lib/utils";
import type { Mood } from "@/store/useApp";

const ICONS: Record<string, LucideIcon> = { CloudRain, Cloud, Sun, Sunrise };

export function MoodPicker({ value, onChange }: { value: Mood; onChange: (m: Mood) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-[20px] font-extrabold text-ink leading-snug">А как ты сейчас?</h2>
        <p className="text-[14px] font-semibold text-muted mt-1">
          Это увидит только он — в виде подсказки, как лучше себя вести.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {MOODS.map((m, i) => {
          const Icon = ICONS[m.icon] ?? Sun;
          const active = value === m.id;
          return (
            <motion.button
              key={m.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, type: "spring", stiffness: 300, damping: 24 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(active ? null : m.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl px-4 h-[58px] text-[15px] font-bold transition-colors",
                active
                  ? "bg-gradient-to-br from-primary to-accent text-white shadow-[0_6px_18px_rgba(232,131,127,.35)]"
                  : "bg-surface border border-line text-ink hover:border-primary/40"
              )}
            >
              <Icon size={20} className={active ? "text-white" : "text-primary"} />
              {m.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
