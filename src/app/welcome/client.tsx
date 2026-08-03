"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Brain, MessageCircleHeart, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

// Экран 1: эмоциональный крючок (3 фразы с автосменой)
// Экран 2: демонстрация ценности → «Создать мою инструкцию»
const HOOKS = [
  "Ты устала объяснять ему, что с тобой происходит?",
  "Он не телепат. Но ему хватит одной подсказки в день.",
  "CareMode — твой переводчик эмпатии.",
];

const VALUE_CARDS = [
  {
    icon: MessageCircleHeart,
    title: "Создай своё послание один раз",
    desc: "Что помогает, что бесит, какая фраза сработает — всё в одном месте",
  },
  {
    icon: Brain,
    title: "ИИ подскажет ему, что делать",
    desc: "Каждый день — одна точная подсказка. Без догадок и обид",
  },
  {
    icon: Heart,
    title: "Перестань объяснять — начни быть понятой",
    desc: "Он узнает, как поддержать именно тебя. Ты почувствуешь разницу",
  },
];

export function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState<"hook" | "value">("hook");
  const [hookIdx, setHookIdx] = useState(0);

  // автосмена фраз
  useEffect(() => {
    if (step !== "hook") return;
    const t = setInterval(() => setHookIdx((i) => (i + 1) % HOOKS.length), 2400);
    return () => clearInterval(t);
  }, [step]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md flex flex-col items-center"
      >
        <Logo size={44} />

        {step === "hook" ? (
          <div className="mt-14 flex flex-col items-center flex-1 justify-center min-h-[220px] w-full">
            <AnimatePresence mode="wait">
              <motion.h1
                key={hookIdx}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="text-[26px] font-extrabold text-ink text-center leading-snug max-w-[320px]"
              >
                {HOOKS[hookIdx]}
              </motion.h1>
            </AnimatePresence>

            {/* точки-прогресс фраз */}
            <div className="flex gap-1.5 mt-8">
              {HOOKS.map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === hookIdx ? "bg-primary" : "bg-line"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setStep("value")}
              className="mt-10 h-[56px] px-8 rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[15px] flex items-center gap-2 shadow-[0_8px_24px_rgba(232,131,127,.4)] active:scale-[.97] transition"
            >
              Узнать, как это работает
              <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full mt-8"
          >
            <h1 className="font-pixel text-[15px] text-ink leading-relaxed text-center">
              Как это работает
            </h1>
            <div className="flex flex-col gap-3 mt-6">
              {VALUE_CARDS.map((c, i) => (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 * i + 0.1 }}
                  className="rounded-[24px] bg-surface shadow-[0_8px_30px_rgba(232,131,127,.14)] p-5 flex items-start gap-4"
                >
                  <div className="w-11 h-11 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                    <c.icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <div className="text-[15px] font-extrabold text-ink">{c.title}</div>
                    <div className="text-[13px] font-semibold text-muted mt-1 leading-snug">
                      {c.desc}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              onClick={() => router.push("/register?role=OWNER")}
              className="mt-7 w-full h-[56px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[15px] shadow-[0_8px_24px_rgba(232,131,127,.4)] active:scale-[.97] transition"
            >
              Создать моё послание
            </button>

            <p className="text-center text-[14px] font-semibold text-muted mt-5">
              Уже есть код?{" "}
              <Link href="/register" className="text-primary font-extrabold">
                Войти в пару
              </Link>
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
