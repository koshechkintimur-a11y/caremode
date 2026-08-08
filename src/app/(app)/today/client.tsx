"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Gift, Medal, Send, Siren, X, MessageCircleHeart, Sparkles, Check } from "lucide-react";
import { DailyCard } from "@/components/DailyCard";
import { EventsBlock } from "@/components/EventsBlock";
import { PhotoView } from "@/components/PhotoView";
import { PauseCard } from "@/components/PauseCard";
import { PaywallCard } from "@/components/PaywallCard";
import { Tamagotchi, stageOf, STAGE_LABEL } from "@/components/Tamagotchi";
import { CoachTips } from "@/components/CoachTips";
import { DayCarousel } from "@/components/DayCarousel";
import { shareCard } from "@/components/ShareCard";
import { StreakRing } from "@/components/StreakRing";
import { MOODS, NEEDS, needLabel } from "@/lib/careOptions";
import { computeCycleStats } from "@/lib/cycle";
import { useApp } from "@/store/useApp";
import { useWeather, MOOD_WEATHER, PHASE_WEATHER } from "@/store/uiStore";
import { PHASE_LABEL, PHASE_HINT, PHASE_RANGES, dayOfCycle, phaseFromStartDate, phaseOfDay } from "@/lib/phase";
import { getPerk, nextPerk } from "@/lib/perks";
import { cn } from "@/lib/utils";

interface TodayData {
  prompt: { id: string; day: string; text: string; feedback: string | null; source?: string; seenAt: string | null; thankedAt: string | null } | null;
  paused: boolean;
  paywall: boolean;
  streak: number;
  role: "OWNER" | "PARTNER";
  aiCardsLeft: number;
  subStatus: string;
  pausePartner: boolean;
  cycleDay: number | null;
  cycleVisible: boolean;
  ownerMood: string | null;
  ownerNeedsSpace: boolean;
  ownerNeed: string | null;
  ownerPeriodEnded: boolean;
  ownerNeedDetail: { text?: string; photo?: string } | null;
  suppliesDetail: { text?: string; photo?: string } | null;
  emptyOwner: boolean;
  cycleDayStates: Record<string, string>;
  cozy: string[];
  firstName: string | null;
  partnerFirstName: string | null;
  request: { need: string; detail: { text?: string; photo?: string } | null; done: boolean; thanked: boolean; answer: string | null } | null;
  supplies: { at: string; done: boolean } | null;
}

interface CashbackData {
  goodCount: number;
  threshold: number;
  canReward: boolean;
  reward: { text: string; date: string } | null;
  templates: string[];
  role: "OWNER" | "PARTNER";
}

type Done = "GOOD" | "BAD" | null;

const MOOD_LABEL: Record<string, string> = {
  TERRIBLE: "Всё бесит",
  MEH: "Так себе",
  OKAY: "Нормально",
  GREAT: "Отлично",
};

export default function TodayPage() {
  const router = useRouter();
  const hydrated = useApp((s) => s.hydrated);
  const store = useApp();
  const setWeather = useWeather((s) => s.setWeather);
  const [data, setData] = useState<TodayData | null>(null);
  const [cashback, setCashback] = useState<CashbackData | null>(null);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardText, setRewardText] = useState("");
  const [rewardBusy, setRewardBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [navBusy, setNavBusy] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosBusy, setSosBusy] = useState(false);
  const [sosResult, setSosResult] = useState<{ phrase: string; action: string; passwordPhrase: string } | null>(null);
  const [rewardClosed, setRewardClosed] = useState(false);
  const [needNowUI, setNeedNowUI] = useState<string | null | "loading">("loading");
  const [periodStartOpen, setPeriodStartOpen] = useState(false);
  const [suppliesBusy, setSuppliesBusy] = useState(false);
  const [suppliesDone, setSuppliesDone] = useState(false);
  const [suppliesSent, setSuppliesSent] = useState(false);
  const [detailOpen, setDetailOpen] = useState<"supplies" | "food" | "movie" | "talk" | null>(null);
  const [detailText, setDetailText] = useState("");
  const [detailPhoto, setDetailPhoto] = useState<string | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [movieOpen, setMovieOpen] = useState(false);
  const [movieTitle, setMovieTitle] = useState("");
  const [movieBusy, setMovieBusy] = useState(false);
  const [cycleInfoOpen, setCycleInfoOpen] = useState(false);
  const [care, setCare] = useState<{
    goodCount: number;
    streak: number;
    perkTitle: string;
    nextPerkTitle: string | null;
    nextPerkAt: number | null;
    recent: { id: string; text: string; day: string; thanked: boolean; seen: boolean }[];
  } | null>(null);

  useEffect(() => {
    if (data?.role !== "OWNER") return;
    fetch("/api/partner-care")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setCare(b))
      .catch(() => {});
  }, [data?.role]);

  const SOS_TYPES = [
    { id: "forgot", label: "Забыл про важное" },
    { id: "said", label: "Сказал глупость" },
    { id: "didnt_help", label: "Не помог" },
    { id: "unknown", label: "Всё плохо, не знаю" },
  ] as const;
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/prompt/today");
      if (res.ok) {
        const next = await res.json();
        // при «пульсе» текст карточки меняется — key={text} переанимирует её
        setData(next);
      }
    } catch {
      // сеть — тихо; следующий тик поллинга всё подтянет
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- канонический fetch-on-mount + пульс-поллинг
      load();
      // ПУЛЬС: партнёрская карточка обновляется, если она сменила настроение
      const t = setInterval(load, 30_000);
      return () => clearInterval(t);
    }
  }, [hydrated, load]);

  // «Злой режим»: плохое настроение/«не трогать» — темнеет ВСЁ окружение (карточки,
  // шрифт, акценты), не только океан. Класс .storm на <html> → CSS-переменные в globals.css.
  useEffect(() => {
    const stormy =
      data?.role === "OWNER"
        ? store.mood === "TERRIBLE" || store.needsSpace
        : Boolean(data?.ownerMood === "TERRIBLE" || data?.ownerNeedsSpace);
    const el = document.documentElement;
    el.classList.toggle("storm", stormy);
    return () => el.classList.remove("storm");
  }, [data?.ownerMood, data?.ownerNeedsSpace, data?.role, store.mood, store.needsSpace]);

  // кэшбэк: состояние награды
  useEffect(() => {
    if (!hydrated) return;
    fetch("/api/cashback")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setCashback(b))
      .catch(() => {});
  }, [hydrated]);

  // пиксельная погода = её состояние: у OWNER — её настроение,
  // у PARTNER — настроение Оли (если есть), иначе фаза цикла
  useEffect(() => {
    if (!data) return;
    if (data.role === "OWNER") {
      const w = MOOD_WEATHER[store.mood ?? ""];
      setWeather(w ?? PHASE_WEATHER[store.phase ?? "UNKNOWN"] ?? "clouds");
    } else {
      const w = MOOD_WEATHER[data.ownerMood ?? ""];
      setWeather(w ?? PHASE_WEATHER[data.cycleDay ? phaseOfDay(data.cycleDay) : "UNKNOWN"] ?? "clouds");
    }
  }, [data, store.mood, store.phase, setWeather]);

  async function feedback(kind: "GOOD" | "BAD") {
    if (!data?.prompt || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/prompt/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId: data.prompt.id, feedback: kind }),
      });
      if (res.ok) {
        const body = await res.json();
        setData((d) => (d ? { ...d, streak: body.streak } : d));
        setDone(kind);
        if (body.unlocked?.length) setUnlocked(body.unlocked);
        // обновляем GOOD/перк-статус и питомца
        fetch("/api/cashback")
          .then((r) => (r.ok ? r.json() : null))
          .then((b) => b && setCashback(b))
          .catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }

  async function setMoodNow(m: "TERRIBLE" | "MEH" | "OKAY" | "GREAT" | null) {
    store.setMood(m);
    try {
      await fetch("/api/profile/phase", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: store.phase, mood: m }),
      });
    } catch {}
  }

  async function setPeriodDate(iso: string) {
    if (!iso) return;
    store.setLastPeriod(iso);
    store.recordCycleStart(iso);
    // дата указана через навигатор — включаем видимость сразу
    store.setCycleDayVisible(true);
    try {
      await Promise.all([
        fetch("/api/profile/cycle", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cycleDay: dayOfCycle(iso), visible: true, expectedCycleDay: expectedCycleDay() }),
        }),
        fetch("/api/profile/phase", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: phaseFromStartDate(iso), mood: store.mood }),
        }),
      ]);
    } catch {}
  }

  async function toggleNavigator() {
    if (navBusy) return;
    setNavBusy(true);
    const next = !store.cycleDayVisible;
    store.setCycleDayVisible(next);
    try {
      await fetch("/api/profile/cycle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleDay: store.cycleDay, visible: next, expectedCycleDay: expectedCycleDay() }),
      });
    } finally {
      setNavBusy(false);
    }
  }

  async function giveReward() {
    if (rewardBusy || rewardText.trim().length < 2) return;
    setRewardBusy(true);
    try {
      const res = await fetch("/api/cashback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rewardText.trim() }),
      });
      if (res.ok) {
        const b = await res.json();
        setCashback((c) => (c ? { ...c, canReward: false, reward: b.reward } : c));
        setRewardOpen(false);
        setToast("Сертификат улетел к нему 🎁");
        setTimeout(() => setToast(""), 2600);
      }
    } finally {
      setRewardBusy(false);
    }
  }

  async function runSos(type: string) {
    if (sosBusy) return;
    setSosBusy(true);
    setSosResult(null);
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const b = await res.json();
        setSosResult({ phrase: b.phrase, action: b.action, passwordPhrase: b.passwordPhrase ?? "" });
      } else if (res.status === 429) {
        setToast("Лимит SOS на сегодня — 3. Завтра будет новый план 🫡");
        setTimeout(() => setToast(""), 2600);
        setSosOpen(false);
      }
    } finally {
      setSosBusy(false);
    }
  }

  async function share() {
    if (!data?.prompt) return;
    try {
      await shareCard(data.prompt.text);
      setToast("Карточка готова — пост в сторис 🔥");
    } catch {
      setToast("Не вышло. Попробуй ещё раз.");
    }
    setTimeout(() => setToast(""), 2600);
  }

  // «Что тебе нужно?» — выбор Оли; мгновенный пуш партнёру с сервера
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => setNeedNowUI(data.ownerNeed ?? null), 0);
    return () => clearTimeout(t);
  }, [data?.ownerNeed]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setNeed(id: string | null) {
    // «Еду», «Фильм», «Поговорить» — сначала детали (модалка), отправка после
    if (id && (id === "food" || id === "movie" || id === "talk")) {
      setDetailText("");
      setDetailPhoto(null);
      setDetailOpen(id as "food" | "movie" | "talk");
      return;
    }
    setNeedNowUI(id);
    try {
      await fetch("/api/profile/phase", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needNow: id }),
      });
    } catch {
      /* не критично — отметка останется на сервере при следующем действии */
    }
  }

  // сжатие фото на клиенте: максимум 700px, JPEG 0.6 — чтобы dataURL был лёгким
  function compressPhoto(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, 700 / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("no ctx"));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        };
        img.onerror = reject;
        img.src = String(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // отправка деталей из модалки (textOverride — для кнопок с фиксированным текстом,
  // state не успевает обновиться до вызова — классический баг замыкания)
  async function sendDetail(textOverride?: string) {
    if (detailBusy || !detailOpen) return;
    const text = (textOverride ?? detailText).trim();
    if (detailOpen === "supplies") {
      await reportSupplies({ text: text || undefined, photo: detailPhoto ?? undefined });
      return;
    }
    setDetailBusy(true);
    setNeedNowUI(detailOpen);
    try {
      await fetch("/api/profile/phase", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          needNow: detailOpen,
          needDetail: {
            ...(text ? { text } : {}),
            ...(detailPhoto ? { photo: detailPhoto } : {}),
          },
        }),
      });
      setToast("Он уже знает, что именно ты хочешь 💛");
      setTimeout(() => setToast(""), 2600);
    } catch {
      setToast("Не получилось — попробуй ещё раз");
      setTimeout(() => setToast(""), 2600);
    } finally {
      setDetailBusy(false);
      setDetailOpen(null);
    }
  }

  // ожидаемый день старта (число) — для «штормового предупреждения» партнёру
  function expectedCycleDay(): number | null {
    if (!store.cycleDay || !store.lastPeriodStart) return null;
    const stats = computeCycleStats(store.cycleHistory, store.lastPeriodStart);
    if (stats.daysUntilNext === null || stats.daysUntilNext < 0) return null;
    return store.cycleDay + stats.daysUntilNext;
  }

  // Олина заглушка: карточка не генерируется, пока она ничего не настроила
  const ownerEmptyCard = data
    ? data.emptyOwner && data.role === "OWNER" ? (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-[28px] bg-surface/55 backdrop-blur-[16px] p-8 text-center shadow-[0_16px_48px_rgba(232,131,127,.14)]"
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center">
          <Sparkles size={26} className="text-primary" />
        </div>
        <h2 className="mt-4 text-[20px] font-extrabold text-ink">
          Подсказка появится, когда ты отметишь, как себя чувствуешь
        </h2>
        <p className="mt-2 text-[14px] font-semibold text-muted leading-relaxed">
          Один тап в пульсе — и он получит её первой 🌊
        </p>
      </motion.div>
    ) : null
    : null;

  // «Напомнить ей» — пуш Оле (empty-state партнёра, пока она не собрала послание)
  async function remind() {
    setToast("Отправляем…");
    try {
      const res = await fetch("/api/push/remind", { method: "POST" });
      if (res.ok) {
        const b = await res.json();
        setToast(b.sent > 0 ? "Напомнили! 🍾" : "Она не включила уведомления — напиши ей сам 😉");
      } else {
        setToast("Не вышло. Попробуй ещё раз.");
      }
    } catch {
      setToast("Не вышло. Попробуй ещё раз.");
    }
    setTimeout(() => setToast(""), 2600);
  }

  // ===== загрузка =====
  if (!hydrated || !data) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4">
        <div className="h-[320px] rounded-[28px] bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse" />
        <div className="h-[54px] rounded-full bg-surface/55 animate-pulse" />
      </div>
    );
  }

  // ===== OWNER: прозрачность + пульс =====
  if (data.role === "OWNER") {
    // состояние «мои дни»: идёт ли сейчас период.
    // В периоде: дни 1-7 цикла (типичная длина месячных) ИЛИ любой отмеченный день.
    // Важно: periodDays может быть [1] (нажали «Сегодня» 4 дня назад) — день 4
    // не отмечен, но месячные идут — кнопка должна быть «Закончились сегодня».
    const inPeriod =
      store.cycleDay !== null &&
      (store.cycleDay <= 7 || store.periodDays.includes(store.cycleDay));
    const lateDays = (() => {
      if (!store.cycleDay || !store.lastPeriodStart) return null;
      const stats = computeCycleStats(store.cycleHistory, store.lastPeriodStart);
      if (stats.dayNow === null || stats.daysUntilNext === null) return null;
      if (stats.daysUntilNext >= 0) return null;
      // старт ожидался N дней назад
      return -stats.daysUntilNext;
    })();
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md flex flex-col gap-5"
      >
        {data.paused ? (
          <PauseCard />
        ) : (
          <div className="rounded-[28px] bg-gradient-to-br from-primary/80 via-[#E98F8B]/75 to-accent/80 p-7 text-white shadow-[0_16px_48px_rgba(232,131,127,.3)] backdrop-blur-[16px]">
            <span
              className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/90"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,.5)" }}
            >
              {data.prompt?.feedback === "GOOD" ? "Он сделал это сегодня" : "Подсказка для него сегодня"}
            </span>
            <p
              className="mt-4 text-[19px] font-extrabold leading-snug"
              style={{ textShadow: "0 2px 14px rgba(0,0,0,.55)" }}
            >
              {data.prompt?.feedback === "GOOD" ? "✓ Готово — забота уже в пути" : (data.prompt?.text ?? "…")}
            </p>
            {data.prompt?.feedback === "GOOD" && (
              data.prompt.thankedAt ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-[13px] font-extrabold">
                  Ты заметила ✨
                </div>
              ) : (
                <button
                  onClick={async () => {
                    const res = await fetch("/api/prompt/thank", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ promptId: data.prompt!.id }),
                    });
                    if (res.ok) {
                      // мгновенно: «Ты заметила ✨» без поллинга
                      setData((d) =>
                        d?.prompt
                          ? { ...d, prompt: { ...d.prompt, thankedAt: new Date().toISOString() } }
                          : d
                      );
                      setToast("Он увидит, что ты заметила 💛");
                      setTimeout(() => setToast(""), 2600);
                    }
                  }}
                  className="mt-4 h-[42px] px-6 rounded-full bg-white text-primary font-extrabold text-[13px] active:scale-[.97] transition"
                >
                  Заметить 💛
                </button>
              )
            )}
          </div>
        )}

        {/* плашка прозрачности — после карточки, в контексте «почему я вижу его карточку» */}
        <div className="flex items-center gap-2 text-[13px] font-bold text-muted">
          <Eye size={15} className="text-primary" />
          Режим прозрачности: ты видишь то же, что и он
        </div>

        {/* Обучалка: подсказки для OWNER (встроенные) */}
        <CoachTips
          tips={[
            {
              id: "mood",
              anchor: "mood",
              text: "Твоё настроение становится погодой у него: «Всё бесит» — шторм, «Отлично» — солнце. Так он понимает, что с тобой.",
            },
            {
              id: "space",
              anchor: "space",
              text: "Отметь «Не трогать» — у него питомец станет колючим, и он поймёт: сегодня лучше не приставать.",
            },
          ]}
        />

        {/* ПУЛЬС: быстрое обновление настроения — карточка партнёра меняется */}
        <div className="rounded-[24px] bg-surface/55 backdrop-blur-[16px] p-5 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
          <div className="text-[15px] font-extrabold text-ink">
            {data.firstName ? `Привет, ${data.firstName}!` : "Привет!"} Как ты сейчас?
          </div>
          {!data.firstName && (
            <Link href="/settings" className="text-[11px] font-bold text-primary mt-0.5 inline-block">
              Как тебя зовут? Добавить имя →
            </Link>
          )}
          <div className="text-[12px] font-semibold text-muted mt-0.5 mb-3">
            Он увидит это как новую подсказку — моментально
          </div>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => {
              const active = store.mood === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMoodNow(active ? null : m.id)}
                  className={cn(
                    "rounded-full px-4 h-[40px] text-[13px] font-bold transition-colors border",
                    active
                      ? "bg-gradient-to-br from-primary to-accent text-white border-transparent"
                      : "bg-surface/55 text-ink border-line hover:border-primary/40"
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          {/* «Не трогать» — отдельная отметка: питомец у него станет красным и колючим */}
          <button
            onClick={toggleNeedsSpace}
            className={cn(
              "mt-3 w-full h-[46px] rounded-full text-[14px] font-extrabold border-2 transition-colors active:scale-[.98]",
              store.needsSpace
                ? "bg-[#E05C5C] border-transparent text-white"
                : "bg-surface/55 text-[#B04A4A] border-[#E05C5C]/40"
            )}
          >
            {store.needsSpace ? "Не трогать — отмечено" : "Не трогать сегодня"}
          </button>

          {/* Что тебе нужно? — убирает угадывание: партнёр видит и получает пуш */}
          <div className="mt-4">
            <div className="text-[13px] font-extrabold text-ink">Что тебе сейчас нужно?</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {NEEDS.map((n) => {
                const active = needNowUI === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setNeed(active ? null : n.id)}
                    className={cn(
                      "rounded-full px-3.5 h-[38px] text-[13px] font-bold transition-colors border",
                      active
                        ? "bg-gradient-to-br from-primary to-accent text-white border-transparent"
                        : "bg-surface/55 text-ink border-line hover:border-primary/40"
                    )}
                  >
                    {n.emoji} {n.label}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] font-semibold text-muted mt-1.5">
              он перестанет гадать
            </div>

            {/* Активная просьба: статус для Оли — увидел / взял / поблагодарила */}
            {data.request && !data.request.done && (
              <div className="mt-3 rounded-2xl border-2 border-primary/40 bg-primary-soft/60 px-4 py-3">
                <div className="text-[13px] font-extrabold text-primary">
                  {data.partnerFirstName ?? "Он"} ещё не видел…
                </div>
                <div className="text-[11px] font-semibold text-muted mt-0.5">
                  Как только увидит — возьмёт на себя, и ты узнаешь.
                </div>
              </div>
            )}
            {data.request?.done && !data.request.thanked && (
              <div className="mt-3 rounded-2xl border-2 border-success/40 bg-success/10 px-4 py-3">
                <div className="text-[13px] font-extrabold text-ink">
                  {data.request.need === "alone"
                    ? `${data.partnerFirstName ?? "Он"} понял — не пристаёт 💛`
                    : data.request.need === "movie" && data.request.answer
                      ? `${data.partnerFirstName ?? "Он"} выбрал: ${data.request.answer} 🍿`
                      : `${data.partnerFirstName ?? "Он"} взял это на себя 💛`}
                </div>
                <div className="text-[11px] font-semibold text-muted mt-0.5">
                  {data.request.need === "alone"
                    ? "он увидел, что тебе нужно пространство — и уважает это"
                    : data.request.need === "movie" && data.request.answer
                      ? "можно готовить попкорн — он уже в деле"
                      : `${needLabel(data.request.need)}${data.request.detail?.text ? ` — ${data.request.detail.text}` : ""} · можно не напоминать`}
                </div>
                <button
                  onClick={async () => {
                    const res = await fetch("/api/request/thank", { method: "POST" });
                    if (res.ok) {
                      setData((d) => (d?.request ? { ...d, request: { ...d.request, thanked: true } } : d));
                      setToast("Он увидит твою благодарность ✨");
                      setTimeout(() => setToast(""), 2600);
                    }
                  }}
                  className="mt-2.5 w-full h-[42px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[13px] active:scale-[.97] transition"
                >
                  {data.request.need === "alone" ? "Спасибо, что понял 💛" : "Спасибо 💛"}
                </button>
              </div>
            )}
            {data.request?.done && data.request.thanked && (
              <div className="mt-3 rounded-2xl border border-line bg-surface/70 px-4 py-3">
                <div className="text-[13px] font-extrabold text-success">
                  ✨ Ты поблагодарила — он счастлив
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] bg-surface/55 backdrop-blur-[16px] p-5 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
            <div className="text-[12px] font-bold uppercase tracking-wider text-muted">Твоя фаза</div>
            <div className="mt-1.5 text-[16px] font-extrabold text-ink">
              {store.phase ? PHASE_LABEL[store.phase] : "не указана"}
            </div>
            <div className="mt-1 text-[12px] font-semibold text-muted">
              {store.lastPeriodStart ? "рассчитано на устройстве" : "уточни в настройках"}
            </div>
          </div>
          <div className="rounded-[24px] bg-surface/55 backdrop-blur-[16px] p-5 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
            <div className="text-[12px] font-bold uppercase tracking-wider text-muted">Настроение</div>
            <div className="mt-1.5 text-[16px] font-extrabold text-ink">
              {store.mood ? MOOD_LABEL[store.mood] : "не указано"}
            </div>
            <div className="mt-1 text-[12px] font-semibold text-muted">он видит это как контекст</div>
          </div>
        </div>

        {/* Мои дни: всегда раскрыто (без сворачивания) */}
        <div className="rounded-[24px] bg-surface/55 backdrop-blur-[16px] p-5 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
          <div>
            <div className="text-[15px] font-extrabold text-ink">Мои дни</div>
            <div className="text-[12px] font-semibold text-muted mt-0.5">
              {store.cycleDay
                ? inPeriod
                  ? `месячные: ${store.periodDays[0]}–${store.periodDays[store.periodDays.length - 1]}${store.lastPeriodStart ? ` · начались ${formatDate(store.lastPeriodStart)}` : ""}`
                  : `день ${store.cycleDay} · ${PHASE_LABEL[store.phase ?? "UNKNOWN"]}${store.lastPeriodStart ? ` · начались ${formatDate(store.lastPeriodStart)}` : ""}`
                : "отметь начало — он поймёт, как тебя поддержать"}
            </div>
          </div>

          {/* кнопки отметки — всегда видны */}
          <div className="mt-3 flex flex-col gap-2.5">
            {inPeriod && !store.periodEnded ? (
              <button
                onClick={endToday}
                className="w-full h-[52px] rounded-full bg-success text-white font-extrabold text-[15px] shadow-[0_8px_24px_rgba(127,169,143,.35)] active:scale-[.97] transition"
              >
                Закончились сегодня
              </button>
            ) : inPeriod && store.periodEnded ? (
              <>
                <div className="w-full rounded-full bg-success/15 px-4 py-3 text-center text-[14px] font-extrabold text-ink">
                  ✓ Закончились сегодня{store.periodDays.length > 0 && ` (${store.periodDays[0]}–${store.periodDays[store.periodDays.length - 1]})`}
                </div>
                <button
                  onClick={() => setPeriodStartOpen((v) => !v)}
                  className="w-full h-[52px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[15px] shadow-[0_8px_24px_rgba(232,131,127,.4)] active:scale-[.97] transition"
                >
                  {periodStartOpen ? "Отмена" : "Месячные начались"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setPeriodStartOpen((v) => !v)}
                className="w-full h-[52px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[15px] shadow-[0_8px_24px_rgba(232,131,127,.4)] active:scale-[.97] transition"
              >
                {periodStartOpen ? "Отмена" : "Месячные начались"}
              </button>
            )}

            {/* запас прокладок: только во время месячных — полный цикл: просьба → «Сделаю» → статус */}
            {inPeriod &&
              (data.supplies?.done ? (
                /* партнёр нажал «Сделаю ✓» — она видит, что он взял на себя */
                <div className="w-full rounded-2xl bg-[#1B1626] px-4 py-3.5 shadow-lg">
                  <div className="text-[13px] font-extrabold text-white">
                    {data.partnerFirstName ?? "Он"} уже в магазине 🛒
                  </div>
                  <div className="text-[11px] font-semibold text-white/70 mt-0.5">
                    Он взял это на себя — спасибо, что предупредила 💛
                  </div>
                  <button
                    onClick={resetSupplies}
                    className="mt-2 w-full h-[38px] rounded-full border-2 border-white/30 text-white font-extrabold text-[12px] active:scale-[.97] transition"
                  >
                    Ок ✓
                  </button>
                </div>
              ) : suppliesSent || (data.supplies && !data.supplies.done) ? (
                /* просьба отправлена (или уже была) — ждём, пока партнёр сходит */
                <div className="w-full rounded-2xl bg-[#1B1626] px-4 py-3.5 shadow-lg">
                  <div className="text-[13px] font-extrabold text-white">
                    {data.partnerFirstName ?? "Он"} уже знает 🛒
                  </div>
                  <div className="text-[11px] font-semibold text-white/70 mt-0.5">
                    Он увидит это в приложении — как только сходит в магазин, ты узнаешь.
                  </div>
                  <button
                    onClick={resetSupplies}
                    className="mt-2 w-full h-[38px] rounded-full border-2 border-white/30 text-white font-extrabold text-[12px] active:scale-[.97] transition"
                  >
                    Отменить
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setDetailText("");
                    setDetailPhoto(null);
                    setDetailOpen("supplies");
                  }}
                  disabled={suppliesBusy}
                  className="w-full h-[46px] rounded-full bg-[#1B1626] text-white font-extrabold text-[13px] active:scale-[.97] transition disabled:opacity-60"
                >
                  {suppliesBusy ? "Отправляем…" : "Закончились прокладки 🩸"}
                </button>
              ))}

            {/* Когда начались? — не сбрасываем на сегодня, если начало было раньше */}
            {periodStartOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-2xl border border-line bg-surface/55 p-4"
              >
                <div className="text-[13px] font-extrabold text-ink">Когда начались?</div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    onClick={() => {
                      setPeriodStartOpen(false);
                      selectPeriodDays([1]);
                    }}
                    className="rounded-xl h-[42px] bg-bg text-[13px] font-bold text-ink border border-line active:scale-[.97] transition"
                  >
                    Сегодня
                  </button>
                  <button
                    onClick={() => {
                      setPeriodStartOpen(false);
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      setPeriodDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                    }}
                    className="rounded-xl h-[42px] bg-bg text-[13px] font-bold text-ink border border-line active:scale-[.97] transition"
                  >
                    Вчера
                  </button>
                  <button
                    onClick={() => {
                      setPeriodStartOpen(false);
                      const d = new Date();
                      d.setDate(d.getDate() - 2);
                      setPeriodDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                    }}
                    className="rounded-xl h-[42px] bg-bg text-[13px] font-bold text-ink border border-line active:scale-[.97] transition"
                  >
                    Позавчера
                  </button>
                </div>
                <button
                  onClick={() => {
                    setPeriodStartOpen(false);
                    setTimeout(() => document.getElementById("period-picker")?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
                  }}
                  className="mt-2 w-full h-[40px] rounded-xl text-[13px] font-bold text-primary border border-primary/40 active:scale-[.97] transition"
                >
                  📅 Выбрать дату
                </button>
                <div className="mt-2 text-[11px] font-semibold text-muted">
                  начались раньше — выбери день, чтобы не сбить цикл
                </div>
              </motion.div>
            )}
          </div>

          {/* История → всегда доступна из «Моих дней» */}
          <button
            onClick={() => router.push("/calendar")}
            className="mt-3 text-[13px] font-bold text-primary underline decoration-dotted underline-offset-2"
          >
            История →
          </button>

            <div className="flex flex-col gap-0 mt-4">
              {/* тумблер видимости */}
              {store.cycleDay && (
                <button
                  onClick={toggleNavigator}
                  disabled={navBusy}
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-line bg-surface/55 p-4 text-left transition-colors"
                >
                  <div>
                    <div className="text-[14px] font-extrabold text-ink">Показывать ему, где я в цикле</div>
                    <div className="text-[12px] font-semibold text-muted mt-0.5 leading-snug">
                      {store.cycleDayVisible
                        ? "он видит день и фазу (без дат)"
                        : "сейчас скрыто — включи, если хочешь, чтобы он понимал больше"}
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
              )}

              {/* 3D-карусель дней: тап по дню = самочувствие (красный/жёлтый/зелёный) */}
              {store.cycleDay && (
                <div className="mt-4">
                  <DayCarousel
                    periodDays={store.periodDays}
                    dayStates={store.dayStates}
                    lastPeriodStart={store.lastPeriodStart}
                    onDayState={(d, color) => {
                      store.setDayState(d, color);
                      fetch("/api/profile/cycle", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          cycleDay: store.cycleDay,
                          visible: store.cycleDayVisible,
                          expectedCycleDay: expectedCycleDay(),
                          dayStates: { ...store.dayStates, [String(d)]: color },
                        }),
                      });
                    }}
                  />
                </div>
              )}

              {/* мягкое уточнение: ожидаемый старт прошёл, а отметки нет */}
              {lateDays !== null && !inPeriod && (
                <div className="mt-3 rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3">
                  <div className="text-[13px] font-bold text-ink">
                    Ожидала начало ~{lateDays} дн назад. Всё ли нормально?
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setPeriodStartOpen(true)}
                      className="h-[38px] px-4 rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[12px] active:scale-[.97] transition"
                    >
                      Да, отметить
                    </button>
                    <button
                      onClick={() => document.getElementById("period-picker")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                      className="h-[38px] px-4 rounded-full bg-surface/55 border border-line text-ink font-bold text-[12px] active:scale-[.97] transition"
                    >
                      Выбрать дату
                    </button>
                  </div>
                </div>
              )}

              {/* пикер даты («Изменить» / «Выбрать дату») */}
              <div id="period-picker" className="mt-3 flex gap-2 items-center">
                <input
                  type="date"
                  value={store.lastPeriodStart ?? ""}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => e.target.value && setPeriodDate(e.target.value)}
                  className="flex-1 h-[44px] rounded-2xl bg-surface/55 border border-line px-4 text-[13px] font-semibold text-ink outline-none focus:border-primary"
                />
                <div className="text-[11px] font-semibold text-muted">первый день</div>
              </div>
            </div>
        </div>

        {/* События пары: отметила — он увидел и подтвердил */}
        <EventsBlock role="OWNER" toast={(t) => { setToast(t); setTimeout(() => setToast(""), 2600); }} />

        {/* Кэшбэк: он прошёл цикл на отлично — вручить награду (редкий блок — ниже ежедневных) */}
        {cashback?.canReward && (
          <div className="rounded-[24px] bg-surface/55 backdrop-blur-[16px] p-5 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                <Gift size={20} className="text-primary" />
              </div>
              <div>
                <div className="text-[15px] font-extrabold text-ink">
                  Он прошёл цикл на отлично
                </div>
                <div className="text-[12px] font-semibold text-muted mt-0.5">
                  {cashback.goodCount} засчитанных дней. Твоя очередь — вручить награду.
                </div>
              </div>
            </div>
            {rewardOpen ? (
              <div className="mt-4 flex flex-col gap-2.5">
                {cashback.templates.map((t) => (
                  <button
                    key={t}
                    onClick={() => setRewardText(t)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left text-[13px] font-bold transition-colors",
                      rewardText === t
                        ? "border-primary bg-primary-soft text-ink"
                        : "border-line bg-surface/55 text-ink"
                    )}
                  >
                    {t}
                  </button>
                ))}
                <input
                  value={rewardText}
                  onChange={(e) => setRewardText(e.target.value)}
                  placeholder="…или напиши свою"
                  className="h-[46px] rounded-2xl bg-surface/55 border border-line px-4 text-[14px] font-semibold text-ink outline-none focus:border-primary"
                />
                <button
                  onClick={giveReward}
                  disabled={rewardBusy || rewardText.trim().length < 2}
                  className="h-[46px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[14px] active:scale-[.97] transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Send size={15} /> Вручить сертификат
                </button>
              </div>
            ) : (
              <button
                onClick={() => setRewardOpen(true)}
                className="mt-4 h-[44px] w-full rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[14px] active:scale-[.97] transition"
              >
                Выбрать награду
              </button>
            )}
          </div>
        )}

        {/* Его забота: как он старается (только для неё) */}
        {care && (
          <div className="rounded-[24px] bg-surface/55 backdrop-blur-[16px] p-5 shadow-[0_8px_30px_rgba(127,169,143,.14)]">
            <div className="text-[15px] font-extrabold text-ink">Его забота</div>
            <div className="text-[12px] font-semibold text-muted mt-0.5">
              он старается ради тебя — {care.goodCount} {pluralCare(care.goodCount)} за 28 дней
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[13px] font-extrabold text-ink">
                  <span className="font-pixel text-ink text-[12px]">{care.perkTitle}</span>
                </div>
                {care.nextPerkTitle ? (
                  <div className="mt-1.5 h-[8px] rounded-full bg-bg overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-success to-[#7ED17E]"
                      style={{ width: `${Math.min(100, Math.round((care.goodCount / care.nextPerkAt!) * 100))}%` }}
                    />
                  </div>
                ) : (
                  <div className="mt-1 text-[12px] font-bold text-muted">максимальный уровень</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-[20px] font-extrabold text-success leading-none">{care.streak}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted mt-0.5">
                  дней подряд
                </div>
              </div>
            </div>
            {care.recent.length > 0 && (
              <div className="mt-3 rounded-2xl bg-bg px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Недавние поступки</div>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  {care.recent.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-[12px] font-semibold text-ink leading-snug">
                      <span>
                        {r.day} · {r.text.length > 90 ? r.text.slice(0, 90) + "…" : r.text}
                      </span>
                      {r.thanked ? (
                        <span className="shrink-0 text-[11px] font-extrabold text-success" title="Она заметила">
                          ✨ заметила
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            const res = await fetch("/api/prompt/thank", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ promptId: r.id }),
                            });
                            if (res.ok) {
                              setCare((c) =>
                                c
                                  ? {
                                      ...c,
                                      recent: c.recent.map((x) =>
                                        x.id === r.id ? { ...x, thanked: true } : x
                                      ),
                                    }
                                  : c
                              );
                              setToast("Он увидит, что ты заметила 💛");
                              setTimeout(() => setToast(""), 2600);
                            }
                          }}
                          className="shrink-0 rounded-full bg-primary-soft px-3 h-[26px] text-[11px] font-extrabold text-primary active:scale-[.95] transition"
                        >
                          💛 Заметить
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* МОДАЛКА ДЕТАЛЕЙ: прокладки / еда / фильм / поговорить */}
        {detailOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setDetailOpen(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[24px] bg-surface p-5 shadow-[0_16px_48px_rgba(0,0,0,.3)]"
            >
              <div className="text-[15px] font-extrabold text-ink">
                {detailOpen === "supplies" && "Какие нужны прокладки? 🩸"}
                {detailOpen === "food" && "Что именно хочешь поесть? 🍫"}
                {detailOpen === "movie" && "Что посмотреть? 🎬"}
                {detailOpen === "talk" && "О чём хочешь поговорить? 💬"}
              </div>
              <div className="text-[12px] font-semibold text-muted mt-0.5">
                {detailOpen === "movie"
                  ? "напиши фильм — или пусть выберет он"
                  : "он увидит это сразу — и сделает ровно то, что нужно"}
              </div>
              <textarea
                value={detailText}
                onChange={(e) => setDetailText(e.target.value)}
                placeholder={
                  detailOpen === "supplies"
                    ? "Например: Always Ultra 3 ночные, 8 шт…"
                    : detailOpen === "food"
                      ? "Например: борщ с хлебом и сметаной…"
                      : detailOpen === "movie"
                        ? "Например: что-то лёгкое, комедию…"
                        : "Например: просто послушай меня, без советов…"
                }
                maxLength={200}
                rows={2}
                className="mt-3 w-full rounded-2xl bg-surface border border-line px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary resize-none"
              />

              {detailOpen === "supplies" && (
                <div className="mt-2 flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 h-[38px] px-4 rounded-full border border-line text-[12px] font-bold text-ink active:scale-[.97] transition cursor-pointer">
                    📷 Фото упаковки
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          const url = await compressPhoto(f);
                          setDetailPhoto(url);
                        } catch {}
                      }}
                    />
                  </label>
                  {detailPhoto && (
                    <div className="relative">
                      <img
                        src={detailPhoto}
                        alt="фото упаковки"
                        className="h-[52px] w-[52px] rounded-xl object-cover border border-line"
                      />
                      <button
                        onClick={() => setDetailPhoto(null)}
                        aria-label="Удалить фото"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#E05C5C] text-white flex items-center justify-center shadow-md active:scale-90 transition"
                      >
                        <X size={11} strokeWidth={3} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                {detailOpen === "movie" && (
                  <button
                    onClick={() => sendDetail("Пусть выберет он 🎲")}
                    disabled={detailBusy}
                    className="flex-1 h-[46px] rounded-full border-2 border-primary/40 text-primary font-extrabold text-[13px] active:scale-[.97] transition disabled:opacity-50"
                  >
                    🎲 Пусть выберет он
                  </button>
                )}
                <button
                  onClick={() => sendDetail()}
                  disabled={detailBusy || (!detailText.trim() && !detailPhoto && detailOpen !== "supplies")}
                  className="flex-1 h-[46px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[13px] disabled:opacity-40 active:scale-[.97] transition"
                >
                  {detailBusy ? "…" : "Отправить"}
                </button>
              </div>
              <button
                onClick={() => setDetailOpen(null)}
                className="mt-2 w-full h-[40px] rounded-full text-[12px] font-bold text-muted active:scale-[.97] transition"
              >
                Отмена
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* тост для OWNER (рендер через portal — виден поверх всего) */}
        {typeof document !== "undefined" &&
          toast &&
          createPortal(
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#3B2E3A] dark:bg-[#1B1626] text-white text-[13px] font-bold px-5 py-3 rounded-full shadow-lg z-50"
            >
              {toast}
            </motion.div>,
            document.body
          )}
      </motion.div>
    );
  }

  async function selectPeriodDays(days: number[]) {
    if (!days.length) return;
    store.setPeriodDays(days);
    store.setPeriodEnded(false); // новый/продолжающийся период — снова открыт
    // первый отмеченный день = день 1 цикла → пересчёт даты старта
    const start = new Date();
    start.setDate(start.getDate() - (days[0] - 1));
    // ЛОКАЛЬНАЯ дата (toISOString() режет по UTC — сдвигает день назад!)
    const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
      start.getDate()
    ).padStart(2, "0")}`;
    store.setLastPeriod(iso);
    store.recordCycleStart(iso);
    await fetch("/api/profile/cycle", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycleDay: store.cycleDay, visible: store.cycleDayVisible, expectedCycleDay: expectedCycleDay(), periodEnded: false }),
    });
  }

  async function toggleNeedsSpace() {
    const next = !store.needsSpace;
    store.setNeedsSpace(next);
    await fetch("/api/profile/phase", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: store.phase, mood: store.mood, needsSpace: next }),
    });
  }

  // «Закончились сегодня» — период от старта до текущего дня, потом явно закрыт.
  // ВАЖНО: не через selectPeriodDays — тот шлёт periodEnded:false (гонка запросов,
  // «закрытие» перезаписывалось). Отмечаем дни локально + один запрос с true.
  function endToday() {
    if (store.cycleDay === null) return;
    const first = store.periodDays[0] ?? 1; // старт мог быть указан датой без отметок дней
    const days: number[] = [];
    for (let d = first; d <= store.cycleDay; d++) days.push(d);
    store.setPeriodDays(days);
    store.setPeriodEnded(true); // период закрыт — кнопка станет «Месячные начались»
    void fetch("/api/profile/cycle", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycleDay: store.cycleDay, visible: store.cycleDayVisible, expectedCycleDay: expectedCycleDay(), periodEnded: true }),
    });
    setToast("✓ Отметила: месячные закончились");
    setTimeout(() => setToast(""), 2600);
  }

  // «Закончились прокладки» (+ какие именно): пуш партнёру — он успеет заехать в магазин
  async function reportSupplies(detail?: { text?: string; photo?: string }) {
    if (suppliesBusy || suppliesSent) return;
    setSuppliesBusy(true);
    try {
      const res = await fetch("/api/cycle/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detail: detail ?? null }),
      });
      if (!res.ok) throw new Error();
      setSuppliesSent(true); // явная реакция: кнопка гаснет, повторный тап невозможен
      setDetailOpen(null);
      setToast("Он уже знает — самое время заехать в магазин 🩸");
    } catch {
      setToast("Не получилось отправить — попробуй ещё раз");
    } finally {
      setSuppliesBusy(false);
      setTimeout(() => setToast(""), 2600);
    }
  }

  // сброс статуса: блок обновляется, кнопка «Закончились прокладки» снова доступна
  async function resetSupplies() {
    try {
      const res = await fetch("/api/cycle/supplies/reset", { method: "POST" });
      if (res.ok) {
        setData((d) => (d ? { ...d, supplies: null } : d));
        setSuppliesSent(false);
      }
    } catch {}
  }

  function formatDate(iso: string): string {
    const [, m, d] = iso.split("-");
    return `${d}.${m}`;
  }

  function pluralCare(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return "поступок";
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "поступка";
    return "поступков";
  }

  // ===== PARTNER =====
  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6">
      <AnimatePresence mode="wait">
        {done === "GOOD" ? (
        <motion.div
          key="good"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[28px] bg-surface/55 backdrop-blur-[16px] p-8 text-center shadow-[0_16px_48px_rgba(127,169,143,.25)]"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <StreakRing streak={data.streak} size={56} />
          </div>
          <h2 className="mt-4 text-[22px] font-extrabold text-ink">Принято. Ты — красавчик.</h2>
          <p className="mt-2 text-[15px] font-semibold text-muted leading-relaxed">
            {data.streak > 0
              ? `Серия заботы: ${data.streak} ${data.streak === 1 ? "день" : "дня"}. Она это ценит — даже если не говорит.`
              : "Она это ценит — даже если не говорит."}
          </p>
          {unlocked.length > 0 && (
            <div className="mt-4 rounded-2xl bg-primary-soft p-3 text-[13px] font-extrabold text-primary">
              Новая ачивка: {unlocked.join(", ")}
            </div>
          )}
          {cashback && (
            <div className="mt-4 rounded-2xl bg-bg p-3 text-[12px] font-bold text-muted">
              +1 GOOD · питомец сыт 🐾 · всего {cashback.goodCount} GOOD
              {nextPerk(cashback.goodCount)
                ? ` · до «${nextPerk(cashback.goodCount)!.title}» ещё ${
                    nextPerk(cashback.goodCount)!.at - cashback.goodCount
                  }`
                : " · максимум"}
            </div>
          )}
          <button
            onClick={() => setDone(null)}
            className="mt-6 h-[50px] px-8 rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[14px] active:scale-[.97] transition"
          >
            Готово
          </button>
        </motion.div>
        ) : done === "BAD" ? (
        <motion.div
          key="bad"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[28px] bg-surface/55 backdrop-blur-[16px] p-8 text-center shadow-[0_16px_48px_rgba(232,131,127,.14)]"
        >
          <h2 className="text-[20px] font-extrabold text-ink">Учту. Завтра подберу лучше.</h2>
          <p className="mt-2 text-[14px] font-semibold text-muted">
            Спасибо за честность — так подсказки становятся точнее.
          </p>
          <button
            onClick={() => setDone(null)}
            className="mt-6 h-[50px] px-8 rounded-full bg-surface/55 border border-line text-ink font-bold text-[14px] active:scale-[.97] transition"
          >
            К карточке дня
          </button>
        </motion.div>
        ) : data.paused ? (
          <PauseCard key="pause" />
        ) : data.paywall ? (
          <PaywallCard key="paywall" />
        ) : (
          <motion.div
            key={`card-${data.prompt?.text ?? "empty"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-5"
          >
            {/* Тамагочи: маскот на облачной сцене, состояние = её эмоции */}
            <div className="w-full">
              <Tamagotchi
                state={
                  !data.ownerMood && !data.ownerNeedsSpace && !data.cycleDay
                    ? "neutral"
                    : data.ownerNeedsSpace || data.ownerMood === "TERRIBLE"
                      ? "spiky"
                      : data.cycleDayStates[String(data.cycleDay ?? 0)] === "red" || data.ownerMood === "MEH"
                        ? "sad"
                        : data.cycleDayStates[String(data.cycleDay ?? 0)] === "yellow"
                          ? "neutral"
                          : "happy"
                }
                goodCount={cashback?.goodCount ?? 0}
                day={data.cycleDay}
              />
              <div className="mt-2 text-[12px] font-bold text-ink/75 text-center leading-relaxed">
                {!data.ownerMood && !data.ownerNeedsSpace && !data.cycleDay ? (
                  "Она ещё не отметила настроение — скоро питомец оживёт"
                ) : (
                  <>
                    Тапни по питомцу — подскажет, что ей нужно
                    <span className="block text-ink/55">Делай дела из карточки — и он растёт</span>
                  </>
                )}
              </div>
              {data.ownerNeedsSpace && (
                <div className="mt-2 rounded-full bg-[#E05C5C]/10 px-4 py-2 text-[13px] font-extrabold text-[#B04A4A] text-center">
                  Ей нужна тишина — но она знает, что ты рядом
                </div>
              )}
              {/* «Она хочет» — активная просьба с полным циклом: взял → она поблагодарила */}
              {data.request && !data.request.done && (
                <div className="mt-3 rounded-2xl border-2 border-primary/50 bg-primary-soft/70 px-4 py-3">
                  <div className="text-[13px] font-extrabold text-primary">
                    {data.request.need === "alone"
                      ? "Ей нужно побыть одной"
                      : `Она хочет: ${needLabel(data.request.need)}`}
                  </div>
                  {data.request.detail?.text && (
                    <div className="mt-1 text-[12px] font-bold text-ink">{data.request.detail.text}</div>
                  )}
                  {data.request.detail?.photo && (
                    <PhotoView src={data.request.detail.photo} alt="что она хочет" className="relative mt-2" />
                  )}
                  {data.request.need === "movie" &&
                  (data.request.detail?.text ?? "").toLowerCase().includes("пусть выберет") ? (
                    <>
                      <div className="mt-2 text-[11px] font-semibold text-muted leading-snug">
                        🎲 Выбор за тобой — она ждёт, что именно ты предложишь
                      </div>
                      <button
                        onClick={() => {
                          setMovieTitle("");
                          setMovieOpen(true);
                        }}
                        className="mt-2.5 w-full h-[42px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[13px] active:scale-[.97] transition"
                      >
                        Предложить фильм 🎬
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={async () => {
                        const res = await fetch("/api/request/done", { method: "POST" });
                        if (res.ok) {
                          setData((d) => (d?.request ? { ...d, request: { ...d.request, done: true } } : d));
                          setToast(data.request?.need === "alone" ? "Она узнает — ты понял 💛" : "Она узнает — ты взял на себя 💛");
                          setTimeout(() => setToast(""), 2600);
                        }
                      }}
                      className="mt-2.5 w-full h-[42px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[13px] active:scale-[.97] transition"
                    >
                      {data.request.need === "alone" ? "Понял, не пристаю" : "Сделаю ✓"}
                    </button>
                  )}
                </div>
              )}
              {data.request?.done && (
                <div className="mt-2 rounded-full bg-success/15 px-4 py-2 text-[13px] font-extrabold text-ink text-center">
                  {data.request.need === "alone"
                    ? "✓ Понял — не пристаю"
                    : data.request.need === "movie" && data.request.answer
                      ? `✓ Ты предложил: ${data.request.answer} 🍿`
                      : "✓ Ты взял это на себя"}
                  {data.request.thanked && <span className="text-success"> · она поблагодарила ✨</span>}
                </div>
              )}
              {data.ownerNeed && !data.request && (
                <div className="mt-2 rounded-full bg-primary-soft px-4 py-2 text-[13px] font-extrabold text-primary text-center">
                  Она хочет: {needLabel(data.ownerNeed)}
                </div>
              )}
              {data.ownerPeriodEnded && (
                <div className="mt-3 rounded-2xl border-2 border-ink/15 bg-surface/55 px-4 py-4">
                  <div className="text-[16px] font-extrabold text-ink">🌤 Месячные закончились</div>
                  <div className="text-[12px] font-semibold text-muted mt-1 leading-snug">
                    Она снова в строю — впереди лучшие дни для свидания и комплиментов.
                  </div>
                </div>
              )}
              {/* ВАЖНЫЕ УВЕДОМЛЕНИЯ: под маскотом, где пусто — тёмная карточка как тост */}
              {data.supplies && !data.supplies.done && !suppliesDone && (
                <div className="mt-3 rounded-2xl bg-[#1B1626] px-4 py-3.5 shadow-lg">
                  <div className="text-[13px] font-extrabold text-white">Закончились прокладки 🩸</div>
                  <div className="text-[11px] font-semibold text-white/70 mt-0.5 leading-snug">
                    Заехать в магазин? На опережение — пока она не попросила дважды.
                  </div>
                  {data.suppliesDetail?.text && (
                    <div className="mt-1.5 text-[12px] font-bold text-white/90">
                      Какие нужны: {data.suppliesDetail.text}
                    </div>
                  )}
                  {data.suppliesDetail?.photo && (
                    <PhotoView src={data.suppliesDetail.photo} alt="упаковка" className="relative mt-2" />
                  )}
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/cycle/supplies/done", { method: "POST" });
                      if (res.ok) {
                        setSuppliesDone(true);
                        setToast("Она узнает — ты уже в пути 💛");
                        setTimeout(() => setToast(""), 2600);
                      }
                    }}
                    className="mt-2.5 w-full h-[42px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[13px] active:scale-[.97] transition"
                  >
                    Сделаю ✓
                  </button>
                </div>
              )}

              {/* ЦИКЛ ПРОСТЫМИ СЛОВАМИ: что с ней происходит и что делать */}
              <div className="mt-4 rounded-2xl bg-surface/55 backdrop-blur-[16px] border border-line p-4">
                <div className="text-[12px] font-bold uppercase tracking-wider text-muted">
                  {data.cycleVisible && data.cycleDay ? "Её цикл простыми словами" : "Как устроен её цикл"}
                </div>
                {data.cycleVisible && data.cycleDay && (
                  <>
                    <div className="mt-1.5 text-[15px] font-extrabold text-ink">
                      Сейчас: {PHASE_LABEL[phaseOfDay(data.cycleDay)]}
                    </div>
                    <div className="text-[12px] font-semibold text-muted mt-0.5">
                      {PHASE_HINT[phaseOfDay(data.cycleDay)]}
                    </div>
                  </>
                )}
                <button
                  onClick={() => setCycleInfoOpen((v) => !v)}
                  className="mt-2 text-[12px] font-bold text-primary"
                >
                  {cycleInfoOpen ? "Скрыть фазы" : "Что происходит по фазам →"}
                </button>
                {cycleInfoOpen && (
                  <div className="mt-2 flex flex-col gap-2">
                    {PHASE_RANGES.map((r) => (
                      <div
                        key={r.phase}
                        className={cn(
                          "rounded-xl px-3 py-2",
                          data.cycleVisible && data.cycleDay && phaseOfDay(data.cycleDay) === r.phase
                            ? "bg-primary-soft"
                            : "bg-bg/60"
                        )}
                      >
                        <div className="text-[12px] font-extrabold text-ink">
                          {PHASE_LABEL[r.phase]} · дни {r.from}–{r.to}
                        </div>
                        <div className="text-[11px] font-semibold text-muted">{PHASE_HINT[r.phase]}</div>
                      </div>
                    ))}
                    <div className="text-[10px] font-semibold text-muted mt-0.5">
                      У каждой девушки цикл свой — это средняя схема, не медицина.
                    </div>
                  </div>
                )}
              </div>

              {/* События пары: она отметила — подтверди */}
              <div className="mt-5 w-full">
                <EventsBlock role="PARTNER" toast={(t) => { setToast(t); setTimeout(() => setToast(""), 2600); }} />
              </div>
            </div>

            {/* Обучалка: маскот (встроенный блок после маскота) */}
        <CoachTips
          tips={[
            {
              id: "pet",
              anchor: "pet",
              text: "Это твой питомец. Он показывает, каково ей сегодня: злится — не приставай, грустит — обними, прыгает — всё отлично. Заботься — и он будет расти.",
            },
          ]}
        />

            {!data.prompt?.text ? (
              ownerEmptyCard ?? (
              /* Empty-state: Оля ещё не собрала послание */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-[28px] bg-surface/55 backdrop-blur-[16px] p-8 text-center shadow-[0_16px_48px_rgba(232,131,127,.14)]"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center">
                  <MessageCircleHeart size={26} className="text-primary" />
                </div>
                <h2 className="mt-4 text-[20px] font-extrabold text-ink">
                  Она ещё собирает твоё послание
                </h2>
                <p className="mt-2 text-[14px] font-semibold text-muted leading-relaxed">
                  Как только будет готово — ты узнаешь первым 🍾
                </p>
                <button
                  onClick={remind}
                  className="mt-5 h-[46px] px-6 rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[13px] active:scale-[.97] transition"
                >
                  Напомнить ей
                </button>
              </motion.div>
              )
            ) : (
              <>
            {data.prompt?.feedback === "GOOD" ? (
              /* Сделано ✓ — карточка закрыта, петля заботы: статусы + благодарность */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-[28px] bg-surface/55 backdrop-blur-[16px] p-6 text-center shadow-[0_16px_48px_rgba(232,131,127,.14)]"
              >
                <div className="mx-auto w-14 h-14 rounded-full bg-success/15 flex items-center justify-center">
                  <Check size={26} className="text-success" />
                </div>
                <div className="mt-3 font-pixel text-[13px] text-ink">Сделано ✓</div>
                <p className="mt-1.5 text-[13px] font-semibold text-muted leading-relaxed">
                  {data.prompt.text.length > 110 ? data.prompt.text.slice(0, 110) + "…" : data.prompt.text}
                </p>
                {data.role === "PARTNER" ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-[12px] font-extrabold text-primary">
                    {data.prompt.thankedAt
                      ? "Она поблагодарила ✨"
                      : data.prompt.seenAt
                        ? "Она видела 💛"
                        : "Забота доставлена — она увидит позже"}
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/prompt/thank", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ promptId: data.prompt!.id }),
                      });
                      if (res.ok) {
                        // мгновенно: «Ты заметила ✨» без поллинга
                        setData((d) =>
                          d?.prompt
                            ? { ...d, prompt: { ...d.prompt, thankedAt: new Date().toISOString() } }
                            : d
                        );
                        setToast("Он увидит, что ты заметила 💛");
                        setTimeout(() => setToast(""), 2600);
                      }
                    }}
                    className="mt-4 h-[42px] px-6 rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[13px] active:scale-[.97] transition"
                  >
                    Заметить 💛
                  </button>
                )}
              </motion.div>
            ) : (
            <DailyCard
              text={data.prompt?.text ?? ""}
              streak={data.streak}
              busy={busy}
              source={(data.prompt?.source as "AI" | "FALLBACK") ?? "AI"}
              onGood={() => feedback("GOOD")}
              onBad={() => feedback("BAD")}
              onShare={share}
            />
            )}
            <CoachTips
              tips={[
                {
                  id: "good",
                  anchor: "card",
                  text: "Сделай это сегодня и отметь GOOD — питомец получит опыт, а у неё появится «Его забота».",
                },
              ]}
            />

            {/* XP: один компактный блок (перк + GOOD + стадия + прогресс) */}
            {cashback && (
              <div className="w-full rounded-2xl bg-surface/45 border border-line px-4 py-3 flex items-center justify-between gap-3">
                <div className="text-[12px] font-bold text-muted">
                  <span className="font-pixel text-ink text-[11px]">{getPerk(cashback.goodCount)?.title ?? "без статуса"}</span>
                  <span className="text-muted"> · {cashback.goodCount} GOOD · {STAGE_LABEL[stageOf(cashback.goodCount)]}</span>
                </div>
                {nextPerk(cashback.goodCount) ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-20 h-[7px] rounded-full bg-bg overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${Math.min(100, Math.round((cashback.goodCount / nextPerk(cashback.goodCount)!.at) * 100))}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-muted">
                      до «{nextPerk(cashback.goodCount)!.title}» ещё {nextPerk(cashback.goodCount)!.at - cashback.goodCount}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] font-bold text-muted shrink-0">максимум</span>
                )}
              </div>
            )}

            {/* SOS: позиция 3 — сразу после действия, всегда в зоне видимости */}
            <button
              onClick={() => {
                setSosResult(null);
                setSosOpen(true);
              }}
              className="h-[50px] w-full rounded-full bg-danger/12 border-2 border-danger/30 text-danger font-extrabold text-[14px] flex items-center justify-center gap-2 active:scale-[.97] transition"
            >
              <Siren size={17} /> Я накосячил — нужен план
            </button>

            {/* Сертификат от неё — блок, пока не закрыт */}
            {cashback?.reward &&
              !rewardClosed &&
              !(typeof window !== "undefined" && localStorage.getItem(`sync-reward-${cashback.reward.date}`) === "1") && (
              <div className="w-full rounded-[24px] border-2 border-dashed border-primary/50 bg-surface/50 backdrop-blur-[16px] p-6 text-center shadow-[0_8px_30px_rgba(232,131,127,.14)]">
                <button
                  onClick={() => {
                    setRewardClosed(true);
                    try {
                      localStorage.setItem(`sync-reward-${cashback.reward!.date}`, "1");
                    } catch {}
                  }}
                  aria-label="Закрыть сертификат"
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg flex items-center justify-center"
                >
                  <X size={14} className="text-muted" />
                </button>
                <div className="mx-auto w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center">
                  <Medal size={22} className="text-primary" />
                </div>
                <div className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
                  Сертификат заботы
                </div>
                <div
                  className="mt-2 text-[17px] font-extrabold text-ink leading-snug"
                  style={{ textShadow: "0 1px 10px rgba(255,255,255,.45)" }}
                >
                  {cashback.reward.text}
                </div>
                <div className="mt-2 text-[12px] font-semibold text-muted">
                  вручила она · {cashback.reward.date}
                </div>
                <button
                  onClick={() => {
                    shareCard(`Сертификат заботы: ${cashback.reward!.text}`).then(() => {
                      setToast("Сертификат готов — пост в сторис 🎖️");
                      setTimeout(() => setToast(""), 2600);
                    });
                  }}
                  className="mt-4 h-[42px] px-5 rounded-full bg-surface/55 border border-line text-ink font-bold text-[13px] flex items-center gap-2 mx-auto active:scale-[.97] transition"
                >
                  <Medal size={14} className="text-primary" /> Поделиться
                </button>
              </div>
            )}

            {/* Список уютного — горизонтальный скролл-чип */}
            {data.cozy?.length > 0 && (
              <div className="rounded-[24px] bg-surface/55 backdrop-blur-[16px] p-5 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
                <div className="text-[14px] font-extrabold text-ink">Что ей уютно в эти дни</div>
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-5 px-5">
                  {data.cozy.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-primary-soft px-3.5 h-[34px] shrink-0 flex items-center text-[12px] font-bold text-primary whitespace-nowrap"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
              </>
            )}

            {/* Навигатор цикла: блок «скоро» — только если Оля не включила; полоска живёт в шапке */}
            {!data.cycleVisible && (
              <div className="w-full rounded-[24px] bg-surface/45 border border-dashed border-line p-4 text-center">
                <div className="text-[13px] font-bold text-muted">
                  Навигатор цикла скоро: она решит, показывать ли его тебе
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOS-шит */}
      <AnimatePresence>
        {sosOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSosOpen(false)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] bg-surface/55 backdrop-blur-[16px] p-6 pb-8 max-w-md mx-auto"
            >
              <div className="flex items-center justify-between">
                <div className="text-[17px] font-extrabold text-ink">Что случилось?</div>
                <button
                  onClick={() => setSosOpen(false)}
                  className="w-9 h-9 rounded-full bg-bg flex items-center justify-center"
                  aria-label="Закрыть"
                >
                  <X size={16} className="text-muted" />
                </button>
              </div>

              {!sosResult ? (
                <div className="flex flex-col gap-2.5 mt-4">
                  {SOS_TYPES.map((t) => (
                    <button
                      key={t.id}
                      disabled={sosBusy}
                      onClick={() => runSos(t.id)}
                      className="rounded-2xl bg-bg px-4 py-3.5 text-[14px] font-extrabold text-ink text-left active:scale-[.98] transition disabled:opacity-50"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex flex-col gap-4"
                >
                  <div className="rounded-2xl bg-danger/10 p-4">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-danger">
                      Скажи ей
                    </div>
                    <div className="mt-1.5 text-[15px] font-extrabold text-ink leading-snug">
                      {sosResult.phrase}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-bg p-4">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
                      Сделай
                    </div>
                    <div className="mt-1.5 text-[14px] font-bold text-ink leading-snug">
                      {sosResult.action}
                    </div>
                  </div>
                  {sosResult.passwordPhrase && (
                    <div className="rounded-2xl bg-primary-soft p-4">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                        Фраза-пароль
                      </div>
                      <div className="mt-1.5 font-pixel text-[11px] text-primary leading-relaxed">
                        {sosResult.passwordPhrase}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setSosOpen(false)}
                    className="h-[50px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[14px] active:scale-[.97] transition"
                  >
                    Понял, делаю
                  </button>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* МОДАЛКА: предложить фильм (ответ на «Пусть выберет он») */}
      {movieOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setMovieOpen(false)}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[24px] bg-surface p-5 shadow-[0_16px_48px_rgba(0,0,0,.3)]"
          >
            <div className="text-[15px] font-extrabold text-ink">Какой фильм предложишь? 🎬</div>
            <div className="text-[12px] font-semibold text-muted mt-0.5">
              она узнает сразу — и сможет поблагодарить
            </div>
            <input
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              placeholder="Например: «Властелин колец», или что-то лёгкое…"
              maxLength={100}
              className="mt-3 w-full h-[46px] rounded-2xl bg-surface border border-line px-3 text-[13px] font-semibold text-ink outline-none focus:border-primary"
            />
            <button
              onClick={async () => {
                if (!movieTitle.trim() || movieBusy) return;
                setMovieBusy(true);
                try {
                  const res = await fetch("/api/request/movie", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: movieTitle.trim() }),
                  });
                  if (res.ok) {
                    setData((d) =>
                      d?.request ? { ...d, request: { ...d.request, done: true, answer: movieTitle.trim() } } : d
                    );
                    setMovieOpen(false);
                    setToast("Она узнает — вечер спасён 🍿");
                    setTimeout(() => setToast(""), 2600);
                  }
                } finally {
                  setMovieBusy(false);
                }
              }}
              disabled={!movieTitle.trim() || movieBusy}
              className="mt-3 w-full h-[46px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[13px] disabled:opacity-40 active:scale-[.97] transition"
            >
              {movieBusy ? "…" : "Отправить"}
            </button>
            <button
              onClick={() => setMovieOpen(false)}
              className="mt-2 w-full h-[40px] rounded-full text-[12px] font-bold text-muted active:scale-[.97] transition"
            >
              Отмена
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* тост через portal: fixed внутри transform-контейнера (framer) на iOS не виден */}
      {typeof document !== "undefined" &&
        toast &&
        createPortal(
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#3B2E3A] dark:bg-[#1B1626] text-white text-[13px] font-bold px-5 py-3 rounded-full shadow-lg z-50"
          >
            {toast}
          </motion.div>,
          document.body
        )}
    </div>
  );
}
