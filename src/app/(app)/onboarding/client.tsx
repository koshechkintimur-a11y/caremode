"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, CalendarDays, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CarePicker, CARE_GROUPS } from "@/components/CarePicker";
import { DONT_GROUP, SUPER_POWERS } from "@/lib/careOptions";
import { MoodPicker } from "@/components/MoodPicker";
import { useApp } from "@/store/useApp";
import { useHydrated } from "@/lib/useHydrated";
import { phaseFromStartDate } from "@/lib/phase";
import { computeCycleStats } from "@/lib/cycle";
import { cn } from "@/lib/utils";

const STEPS = ["Ты", "Бесит", "Цикл", "Штрихи"];

export default function OnboardingPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const store = useApp();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finishCare() {
    if (store.careProfileDirty) {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careProfile: store.careProfile }),
      });
      store.markCareSynced();
    }
    setStep(1);
  }

  async function finishAll() {
    setBusy(true);
    setError("");

    const phase = store.lastPeriodStart
      ? phaseFromStartDate(store.lastPeriodStart)
      : "UNKNOWN";

    // профиль целиком (включая dont / passwordPhrase / superpower)
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ careProfile: store.careProfile }),
    });
    store.markCareSynced();

    await fetch("/api/profile/phase", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase, mood: store.mood }),
    });

    // Навигатор цикла: день (число, без дат) + согласие + ожидаемый старт (число)
    const stats = store.lastPeriodStart
      ? computeCycleStats(store.cycleHistory, store.lastPeriodStart)
      : null;
    const expectedCycleDay =
      store.cycleDay && stats?.daysUntilNext !== null && stats!.daysUntilNext >= 0
        ? store.cycleDay + stats!.daysUntilNext
        : null;
    await fetch("/api/profile/cycle", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycleDay: store.cycleDay, visible: store.cycleDayVisible, expectedCycleDay }),
    });

    const res = await fetch("/api/pair", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    // пара уже существует — это режим редактирования инструкции, не ошибка
    if (res.status === 409) {
      router.push("/instruction");
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Не получилось создать пару. Попробуй ещё раз.");
      setBusy(false);
      return;
    }

    // WOW: сначала показываем её «Инструкцию», оттуда — приглашение партнёра
    router.push("/instruction");
  }

  if (!hydrated) {
    return <div className="w-full max-w-md h-64 rounded-[28px] bg-white/60 animate-pulse" />;
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-6">
      {/* прогресс-шаги */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "font-pixel text-[9px] px-2 py-1 rounded transition-colors",
                i === step ? "bg-primary text-white" : i < step ? "bg-success text-white" : "bg-line text-muted"
              )}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && <span className="w-3 h-[2px] bg-line" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="care"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-8"
          >
            <div>
              <h1 className="text-[26px] font-extrabold text-ink leading-tight">
                Соберём твоё послание. Всего пара вопросов.
              </h1>
              <p className="text-[14px] font-semibold text-muted mt-2">
                Один раз настроила — и он перестал гадать. Подсказки будут про тебя.
              </p>
            </div>

            {CARE_GROUPS.map((g) => (
              <CarePicker
                key={g.key}
                group={g}
                selected={store.careProfile[g.key] ?? []}
                onToggle={(id) => store.toggleCare(g.key, id)}
              />
            ))}

            <Button full onClick={finishCare}>
              Дальше
              <ChevronRight size={18} />
            </Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="dont"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-8"
          >
            <CarePicker
              group={DONT_GROUP}
              selected={store.careProfile.dont ?? []}
              onToggle={(id) => store.toggleCare("dont", id)}
            />
            <Button full onClick={() => setStep(2)}>
              Дальше
              <ChevronRight size={18} />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="cycle"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-8"
          >
            <div>
              <h1 className="text-[26px] font-extrabold text-ink leading-tight">
                Последний штрих — и всё
              </h1>
              <p className="text-[14px] font-semibold text-muted mt-2">
                Эти данные останутся на твоём устройстве. Партнёр увидит только общую «фазу».
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-[20px] font-extrabold text-ink">Когда начался последний цикл?</h2>
              <div className="relative">
                <CalendarDays size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                <input
                  type="date"
                  value={store.lastPeriodStart ?? ""}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => e.target.value && store.setLastPeriod(e.target.value)}
                  className="w-full h-[52px] rounded-2xl bg-surface border border-line pl-11 pr-4 text-[16px] font-semibold text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition"
                />
              </div>
              {store.lastPeriodStart && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[13px] font-bold text-success"
                >
                  Поняла. Он увидит примерно: {phaseFromStartDate(store.lastPeriodStart) === "MENSTRUAL" ? "сейчас ей нужна забота 🤫" : "сегодня ей полегче"}
                </motion.p>
              )}
              <button
                onClick={() => store.clearLastPeriod()}
                className="self-start text-[13px] font-bold text-muted underline decoration-dotted underline-offset-4"
              >
                Не помню / пропустить
              </button>
            </div>

            {/* Согласие на навигатор цикла для партнёра */}
            <button
              onClick={() => store.setCycleDayVisible(!store.cycleDayVisible)}
              disabled={!store.cycleDay}
              className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
                store.cycleDayVisible ? "border-primary bg-primary-soft" : "border-line bg-surface"
              } ${!store.cycleDay ? "opacity-40" : ""}`}
            >
              <div>
                <div className="text-[14px] font-extrabold text-ink">
                  Показывать ему, где я в цикле
                </div>
                <div className="text-[12px] font-semibold text-muted mt-0.5 leading-snug">
                  Навигатор: он увидит только день и фазу. Никаких дат — они остаются на твоём устройстве.
                </div>
              </div>
              <div
                className={`w-[52px] h-[30px] rounded-full transition-colors relative shrink-0 ${
                  store.cycleDayVisible ? "bg-primary" : "bg-line"
                }`}
              >
                <span
                  className={`absolute top-[3px] w-6 h-6 rounded-full bg-white shadow transition-all ${
                    store.cycleDayVisible ? "left-[24px]" : "left-[3px]"
                  }`}
                />
              </div>
            </button>

            <MoodPicker value={store.mood} onChange={store.setMood} />

            <Button full onClick={() => setStep(3)}>
              Дальше
              <ChevronRight size={18} />
            </Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="finish"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-8"
          >
            <div>
              <h1 className="text-[26px] font-extrabold text-ink leading-tight">
                Финальные штрихи
              </h1>
              <p className="text-[14px] font-semibold text-muted mt-2">
                Пара мелочей, которые сделают послание живым
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-[20px] font-extrabold text-ink">Фраза-пароль</h2>
              <p className="text-[13px] font-semibold text-muted -mt-1">
                Что он может сказать — и всё сразу станет легче. Например: «Я уже заказал твои любимые роллы и взял колу без сахара» или «Я взял обезбол и плед, просто лежи»
              </p>
              <div className="relative">
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                <input
                  value={store.careProfile.passwordPhrase ?? ""}
                  onChange={(e) => store.setPasswordPhrase(e.target.value)}
                  placeholder="Например: «Я уже заказал твои любимые роллы и взял колу без сахара»"
                  className="w-full h-[52px] rounded-2xl bg-surface border border-line pl-11 pr-4 text-[15px] font-semibold text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-[20px] font-extrabold text-ink">Твоя суперсила в эти дни</h2>
              <div className="flex flex-wrap gap-2">
                {SUPER_POWERS.map((p) => {
                  const active = store.careProfile.superpower === p.label;
                  return (
                    <button
                      key={p.id}
                      onClick={() => store.setSuperpower(active ? "" : p.label)}
                      className={cn(
                        "rounded-full px-4 h-[42px] text-[13px] font-bold transition-colors border",
                        active
                          ? "bg-gradient-to-br from-primary to-accent text-white border-transparent"
                          : "bg-surface text-ink border-line hover:border-primary/40"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] font-semibold text-muted">
                Это попадёт в послание шуточной строкой. Разряжает обстановку.
              </p>
            </div>

            {error && <p className="text-[13px] font-bold text-danger">{error}</p>}

            <Button full onClick={finishAll} disabled={busy}>
              {busy ? "Собираем твоё послание…" : "Создать моё послание"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
