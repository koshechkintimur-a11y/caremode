"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// Лёгкая обучалка: контекстные подсказки по одной, «Понятно»/«Пропустить».
// Флаги — в localStorage (sync-tips-v1): после чистки данных браузера
// подсказки покажутся снова — это нормально (и юридически нейтрально).
const TIPS_KEY = "sync-tips-v1";

function loadSeen(): string[] {
  try {
    const raw = localStorage.getItem(TIPS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveSeen(seen: string[]) {
  try {
    localStorage.setItem(TIPS_KEY, JSON.stringify(seen));
  } catch {
    /* приватный режим и т.п. — подсказки будут показываться чаще, не страшно */
  }
}

export interface CoachTip {
  id: string;
  text: string;
  /** что показывать рядом: "pet" | "card" | "mood" | "space" | null (низ экрана) */
  anchor?: "pet" | "card" | "mood" | "space" | null;
}

export function CoachTips({ tips }: { tips: CoachTip[] }) {
  const [seen, setSeen] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // асинхронная инициализация из localStorage (без синхронного setState в эффекте)
    const t = setTimeout(() => {
      setSeen(loadSeen());
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // первая непросмотренная подсказка
  const current = ready && !dismissed ? (tips.find((t) => !seen.includes(t.id)) ?? null) : null;

  if (!current) return null;

  const cur: CoachTip = current;

  function done() {
    const next = [...seen, cur.id];
    setSeen(next);
    saveSeen(next);
  }

  function skipAll() {
    const next = [...seen, ...tips.map((t) => t.id)];
    setSeen(next);
    saveSeen(next);
    setDismissed(true);
  }

  return (
    <AnimatePresence>
      <motion.div
        key={cur.id}
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <div className="relative rounded-[22px] bg-[#1B1626]/85 backdrop-blur-[3px] text-white p-5 shadow-[0_12px_40px_rgba(0,0,0,.25)]">
          <button
            onClick={skipAll}
            aria-label="Пропустить обучение"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 active:scale-95 transition"
          >
            <X size={15} />
          </button>
          <p
            className="text-[14px] font-semibold leading-relaxed pr-6"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,.6)" }}
          >
            {current.text}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={done}
              className="h-[38px] px-5 rounded-full bg-white text-[#1B1626] text-[13px] font-extrabold active:scale-[.97] transition"
            >
              Понятно
            </button>
            <button
              onClick={skipAll}
              className="h-[38px] px-3 text-[12px] font-bold text-white/60 active:scale-[.97] transition"
            >
              Пропустить всё
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
