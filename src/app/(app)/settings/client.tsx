"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import {
  ShieldCheck, Lock, Trash2, Trophy, CreditCard, RefreshCw, ChevronRight, Plus, X, FlaskConical, Clock, CalendarDays,
} from "lucide-react";
import { useApp } from "@/store/useApp";
import { useTheme, type Theme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { dayOfCycle, phaseFromStartDate, PHASE_LABEL } from "@/lib/phase";

interface Achievement {
  type: string;
  label: string;
}

interface Perk {
  id: string;
  at: number;
  title: string;
  desc: string;
}

interface MeData {
  subStatus: string;
  aiCardsLeft: number;
  role: "OWNER" | "PARTNER";
  pushEnabled: boolean;
  pushPromptTime: string | null;
}

export default function SettingsPage() {
  const hydrated = useApp((s) => s.hydrated);
  const store = useApp();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [me, setMe] = useState<MeData | null>(null);
  const [promptTime, setPromptTime] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [perk, setPerk] = useState<Perk | null>(null);
  const [nextPerk, setNextPerk] = useState<Perk | null>(null);
  const [totalGood, setTotalGood] = useState(0);
  const [cozyInput, setCozyInput] = useState("");
  const [cozyBusy, setCozyBusy] = useState(false);
  const [pause, setPause] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetch("/api/achievements").then((r) => r.json()),
        fetch("/api/prompt/today").then((r) => r.json()),
      ]);
      setAchievements(a.achievements ?? []);
      setPerk(a.perk ?? null);
      setNextPerk(a.nextPerk ?? null);
      setTotalGood(a.totalGood ?? 0);
      setMe({
        subStatus: b.subStatus ?? "NONE",
        aiCardsLeft: b.aiCardsLeft ?? 0,
        role: b.role ?? "PARTNER",
        pushEnabled: Boolean(b.pushEnabled),
        pushPromptTime: b.pushPromptTime ?? null,
      });
      setPause(Boolean(b.pausePartner));
      setPromptTime(b.promptTime ?? null);
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- канонический fetch-on-mount
    if (hydrated) load();
  }, [hydrated, load]);

  async function togglePause() {
    setBusy(true);
    const next = !pause;
    try {
      const res = await fetch("/api/profile/pause", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausePartner: next }),
      });
      if (res.ok) setPause(next);
    } finally {
      setBusy(false);
    }
  }

  async function resetDevice() {
    store.resetDevice();
    await fetch("/api/profile/phase", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: null, mood: null }),
    });
    setPause(false);
  }

  async function deleteAccount() {
    if (!window.confirm("Точно удалить аккаунт и все данные? Это необратимо.")) return;
    const res = await fetch("/api/profile", { method: "DELETE" });
    if (res.ok) {
      await signOut({ redirect: false });
      window.location.href = "/login";
    }
  }

  // ===== Web Push (только PARTNER: карточка дня на телефон) =====
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState("");

  function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(b64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  async function enablePush() {
    setPushBusy(true);
    setPushErr("");
    try {
      // Web Push на iOS работает только из PWA-ярлыка (не из Safari)
      const isStandalone =
        (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!isStandalone) {
        setPushErr(
          "Открой CareMode из ярлыка на главном экране: Поделиться → «На главный экран», затем включи уведомления оттуда (в Safari они не работают на iPhone)"
        );
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushErr("Этот браузер не поддерживает push-уведомления");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPushErr("Разрешение не выдано — включи уведомления в настройках браузера");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          "BC0TnZxuCskRP1HAtsRZ_g3IzI7-a-Zds6_q5n8vgCiLbZnjN0xgyaJOi-m_P3M_HRyi54dqahrc2cl7QEz5w_8"
        ),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
      });
      if (!res.ok) throw new Error("save failed");
      setPushOn(true);
    } catch {
      setPushErr("Не получилось — попробуй ещё раз (iOS: добавь ярлык на главный экран)");
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushOn(false);
    } finally {
      setPushBusy(false);
    }
  }

  if (!hydrated) {
    return <div className="w-full max-w-md h-64 rounded-[28px] bg-surface/60 animate-pulse" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md flex flex-col gap-4"
    >
      <h1 className="font-pixel text-[18px] text-ink leading-relaxed">Настройки</h1>

      {/* Тема — у обоих */}
      <div className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
        <div className="text-[16px] font-extrabold text-ink">Оформление</div>
        <div className="text-[12px] font-semibold text-muted mt-0.5 mb-4">
          светлая / тёмная / как в системе
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["light", "Светлая"],
              ["dark", "Тёмная"],
              ["system", "Система"],
            ] as [Theme, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "rounded-2xl h-[44px] text-[13px] font-bold border transition-colors",
                theme === t
                  ? "bg-gradient-to-br from-primary to-accent text-white border-transparent"
                  : "bg-surface text-ink border-line"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Приватность — только OWNER */}
      {me?.role === "OWNER" && (
        <div className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <div>
              <div className="text-[16px] font-extrabold text-ink">Приватность</div>
              <div className="text-[12px] font-semibold text-muted">только для тебя</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink">Режим инкогнито</div>
              <div className="text-[12px] font-semibold text-muted mt-0.5">
                {pause ? "партнёр видит только «паузу»" : "подсказки включены"}
              </div>
            </div>
            <button
              onClick={togglePause}
              disabled={busy}
              className={`w-[52px] h-[30px] rounded-full transition-colors relative ${pause ? "bg-primary" : "bg-line"}`}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className={`absolute top-[3px] w-6 h-6 rounded-full bg-surface shadow ${pause ? "left-[24px]" : "left-[3px]"}`}
              />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-bg p-4 flex items-start gap-3">
            <Lock size={16} className="text-muted mt-0.5 shrink-0" />
            <p className="text-[12px] font-semibold text-muted leading-relaxed">
              Данные цикла хранятся только на этом устройстве. На сервере — лишь
              общая «фаза», и только с твоего согласия.
            </p>
          </div>

          <button
            onClick={resetDevice}
            className="mt-4 inline-flex items-center gap-2 text-[13px] font-bold text-muted"
          >
            <RefreshCw size={14} />
            Сбросить данные устройства (фаза, настроение)
          </button>
        </div>
      )}

      {/* Напоминание отметить настроение — только OWNER */}
      {me?.role === "OWNER" && (
        <div className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
          <div className="text-[16px] font-extrabold text-ink">Напоминать мне</div>
          <div className="text-[12px] font-semibold text-muted mt-0.5 mb-4">
            пуш «Как ты сегодня?» — если ещё не отметила настроение
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="text-[14px] font-extrabold text-ink">Напоминания</div>
            <button
              onClick={async () => {
                const next = !me.pushEnabled;
                setMe({ ...me, pushEnabled: next });
                await fetch("/api/profile/push-remind", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ enabled: next, time: me.pushPromptTime }),
                });
              }}
              className={`w-[52px] h-[30px] rounded-full transition-colors relative ${me.pushEnabled ? "bg-primary" : "bg-line"}`}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className={`absolute top-[3px] w-6 h-6 rounded-full bg-surface shadow ${me.pushEnabled ? "left-[24px]" : "left-[3px]"}`}
              />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["9", "Утром · 9:00"],
                ["10", "В 10:00"],
                ["20", "Вечером · 20:00"],
              ] as [string, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={async () => {
                  setMe({ ...me, pushPromptTime: t });
                  await fetch("/api/profile/push-remind", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enabled: me.pushEnabled, time: t }),
                  });
                }}
                className={cn(
                  "rounded-2xl h-[42px] text-[12px] font-bold border transition-colors",
                  me.pushPromptTime === t
                    ? "bg-gradient-to-br from-primary to-accent text-white border-transparent"
                    : "bg-surface text-ink border-line"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 text-[11px] font-semibold text-muted">
            {me.pushEnabled && me.pushPromptTime
              ? `придёт в ${me.pushPromptTime}:00, если ты ещё не отметила день`
              : me.pushEnabled
                ? "выбери время — и начнём напоминать"
                : "включи, чтобы не пропускать день"}
          </div>
        </div>
      )}

      {/* Моя инструкция — только OWNER */}
      {me?.role === "OWNER" && (
        <button
          onClick={() => router.push("/instruction")}
          className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)] flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
            <FlaskConical size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-[16px] font-extrabold text-ink">Моё послание</div>
            <div className="text-[12px] font-semibold text-muted">
              то, что он прочитает первым делом
            </div>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </button>
      )}

      {/* Календарь цикла — только OWNER (история на устройстве) */}
      {me?.role === "OWNER" && (
        <button
          onClick={() => router.push("/calendar")}
          className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)] flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
            <CalendarDays size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-[16px] font-extrabold text-ink">Календарь цикла</div>
            <div className="text-[12px] font-semibold text-muted">
              история дней и стартов — только на устройстве
            </div>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </button>
      )}

      {/* Подписка — только PARTNER */}
      {me?.role === "PARTNER" && (
        <div className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center">
              <CreditCard size={20} className="text-primary" />
            </div>
            <div>
              <div className="text-[16px] font-extrabold text-ink">Подсказки</div>
              <div className="text-[12px] font-semibold text-muted">
                всё бесплатно · ИИ-лимит {me.aiCardsLeft}/2 на сегодня
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-bg p-4 text-[13px] font-bold text-muted">
            Персональные ИИ-подсказки — 2 в день, дальше кураторская подборка. Подписка появится позже.
          </div>
        </div>
      )}

      {/* Данные цикла — только OWNER */}
      {me?.role === "OWNER" && (
        <div className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center">
              <RefreshCw size={18} className="text-primary" />
            </div>
            <div>
              <div className="text-[16px] font-extrabold text-ink">Данные цикла</div>
              <div className="text-[12px] font-semibold text-muted">
                хранятся на устройстве · на сервер уходит только день и фаза
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-[13px] font-bold text-ink mb-2">Первый день последних месячных</div>
            <input
              type="date"
              value={store.lastPeriodStart ?? ""}
              max={new Date().toISOString().slice(0, 10)}
              onChange={async (e) => {
                const iso = e.target.value;
                if (!iso) return;
                store.setLastPeriod(iso);
                await Promise.all([
                  fetch("/api/profile/cycle", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cycleDay: dayOfCycle(iso), visible: store.cycleDayVisible }),
                  }),
                  fetch("/api/profile/phase", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phase: phaseFromStartDate(iso), mood: store.mood }),
                  }),
                ]);
              }}
              className="w-full h-[52px] rounded-2xl bg-surface border border-line px-4 text-[16px] font-semibold text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition"
            />
            {store.phase && (
              <div className="mt-2 text-[12px] font-semibold text-muted">
                сейчас: {PHASE_LABEL[store.phase]} · день {store.cycleDay ?? "—"} цикла
              </div>
            )}
          </div>
        </div>
      )}

      {/* Список уютного — только OWNER */}
      {me?.role === "OWNER" && (
        <div className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
          <div className="text-[16px] font-extrabold text-ink">Список уютного</div>
          <div className="text-[12px] font-semibold text-muted mt-0.5 mb-4">
            не покупки, а действия и состояния: «тёплый плед и сериал», «борщ», «не спрашивать про дела»
          </div>
          <div className="flex gap-2">
            <input
              value={cozyInput}
              onChange={(e) => setCozyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && cozyInput.trim()) {
                  store.addCozy(cozyInput);
                  setCozyInput("");
                }
              }}
              placeholder="добавь что-то уютное"
              className="flex-1 h-[46px] rounded-2xl bg-surface border border-line px-4 text-[14px] font-semibold text-ink outline-none focus:border-primary"
            />
            <button
              onClick={() => {
                store.addCozy(cozyInput);
                setCozyInput("");
              }}
              disabled={!cozyInput.trim()}
              className="h-[46px] px-4 rounded-2xl bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[13px] active:scale-[.97] transition disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
          {(store.careProfile.cozy?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {store.careProfile.cozy!.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-primary-soft px-3.5 h-[34px] flex items-center gap-1.5 text-[12px] font-bold text-primary"
                >
                  {c}
                  <button
                    onClick={() => store.removeCozy(c)}
                    className="opacity-60 hover:opacity-100"
                    aria-label={`Убрать ${c}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <button
            onClick={async () => {
              if (cozyBusy) return;
              setCozyBusy(true);
              try {
                const res = await fetch("/api/profile", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ careProfile: store.careProfile }),
                });
                if (res.ok) store.markCareSynced();
              } finally {
                setCozyBusy(false);
              }
            }}
            className="mt-4 h-[44px] w-full rounded-full bg-surface border border-line text-ink font-bold text-[14px] active:scale-[.97] transition"
          >
            {cozyBusy ? "Сохраняю…" : "Сохранить список"}
          </button>
        </div>
      )}

      {/* Стиль заботы + тайминг — только PARTNER */}
      {me?.role === "PARTNER" && (
        <>
          <button
            onClick={() => router.push("/onboarding/partner")}
            className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)] flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
              <FlaskConical size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-extrabold text-ink">Мой стиль заботы</div>
              <div className="text-[12px] font-semibold text-muted">
                подсказки станут личными — под твой стиль
              </div>
            </div>
            <ChevronRight size={18} className="text-muted" />
          </button>

          <div className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center">
                <Clock size={20} className="text-primary" />
              </div>
              <div>
                <div className="text-[16px] font-extrabold text-ink">Когда присылать карточку?</div>
                <div className="text-[12px] font-semibold text-muted">
                  уведомления на телефон (как в приложении банка)
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {(
                [
                  ["morning", "Утром"],
                  ["wake", "Когда она встала"],
                  ["evening", "Вечером"],
                ] as const
              ).map(([t, label]) => (
                <button
                  key={t}
                  onClick={async () => {
                    setPromptTime(t);
                    await fetch("/api/profile/time", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ promptTime: t }),
                    });
                  }}
                  className={cn(
                    "rounded-2xl px-2 h-[44px] text-[12px] font-bold border transition-colors",
                    promptTime === t
                      ? "bg-gradient-to-br from-primary to-accent text-white border-transparent"
                      : "bg-surface text-ink border-line"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Web Push: подписка на уведомления */}
            <div className="mt-4 rounded-2xl bg-bg p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[13px] font-extrabold text-ink">
                  {pushOn ? "Уведомления включены" : "Включить уведомления"}
                </div>
                <button
                  onClick={pushOn ? disablePush : enablePush}
                  disabled={pushBusy}
                  className={cn(
                    "h-[38px] px-4 rounded-full text-[12px] font-extrabold transition active:scale-[.97]",
                    pushOn
                      ? "bg-surface border border-line text-ink"
                      : "bg-gradient-to-br from-primary to-accent text-white shadow-[0_4px_14px_rgba(232,131,127,.4)]"
                  )}
                >
                  {pushBusy ? "…" : pushOn ? "Выключить" : "Включить"}
                </button>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-muted leading-relaxed">
                {pushOn
                  ? "Карточка дня придёт уведомлением в выбранное время"
                  : "Открой из ярлыка на главном экране — и уведомления придут как в приложении банка"}
              </div>
              {pushErr && <div className="mt-2 text-[11px] font-bold text-danger">{pushErr}</div>}
            </div>
          </div>
        </>
      )}

      {/* Ачивки */}
      <div className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center">
            <Trophy size={20} className="text-primary" />
          </div>
          <div>
            <div className="text-[16px] font-extrabold text-ink">Ачивки</div>
            <div className="text-[12px] font-semibold text-muted">твой личный прогресс</div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {perk && (
            <div className="rounded-2xl bg-primary-soft/60 p-4">
              <div className="text-[13px] font-extrabold text-primary">
                Статус: {perk.title}
              </div>
              <div className="mt-0.5 text-[12px] font-bold text-muted">{perk.desc}</div>
              <div className="mt-2.5 h-1.5 rounded-full bg-primary/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  style={{
                    width: `${Math.min(100, (totalGood / (nextPerk?.at ?? totalGood + 1)) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 text-[11px] font-bold text-muted">
                {nextPerk
                  ? `${totalGood} GOOD · до «${nextPerk.title}» ещё ${nextPerk.at - totalGood}`
                  : `${totalGood} GOOD · максимум уровня`}
              </div>
            </div>
          )}
          {achievements.length === 0 && (
            <p className="text-[13px] font-semibold text-muted">
              Пока пусто. Первая — «Ниндзя эмпатии» за 7 дней заботы подряд.
            </p>
          )}
          {achievements.map((a) => (
            <div
              key={a.type}
              className="flex items-center gap-2.5 rounded-2xl bg-primary-soft/60 px-4 py-3"
            >
              <Trophy size={16} className="text-primary shrink-0" />
              <span className="text-[13px] font-extrabold text-ink">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Опасная зона */}
      <div className="rounded-[24px] bg-surface p-6 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
            <Trash2 size={20} className="text-danger" />
          </div>
          <div>
            <div className="text-[16px] font-extrabold text-ink">Удаление данных</div>
            <div className="text-[12px] font-semibold text-muted">это необратимо</div>
          </div>
        </div>
        <button
          onClick={deleteAccount}
          className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-extrabold text-danger"
        >
          Удалить аккаунт и все данные
          <ChevronRight size={16} />
        </button>
      </div>

      <button
        onClick={async () => {
          await signOut({ redirect: false });
          window.location.href = "/login";
        }}
        className="self-center mt-2 text-[13px] font-bold text-muted"
      >
        Выйти из аккаунта
      </button>

      <p className="text-center text-[12px] font-semibold text-muted mt-3">
        <a href="/privacy" className="text-primary font-bold">
          Политика конфиденциальности
        </a>
      </p>
    </motion.div>
  );
}
