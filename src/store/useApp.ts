"use client";

// Данные цикла живут ТОЛЬКО на устройстве OWNER (localStorage).
// На сервер уходит только фаза + настроение (по явному действию).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CareProfile } from "@/lib/fallback";
import { phaseFromStartDate, dayOfCycle, type Phase } from "@/lib/phase";
import { cycleStorage } from "@/lib/cycleStorage";

export type Mood = "TERRIBLE" | "MEH" | "OKAY" | "GREAT" | null;

interface AppState {
  hydrated: boolean; // true после расшифровки и восстановления стора
  phase: Phase | null;
  mood: Mood;
  lastPeriodStart: string | null; // ISO YYYY-MM-DD — только на устройстве
  cycleDay: number | null; // день цикла (1..) — только на устройстве
  cycleDayVisible: boolean; // согласие: показывать партнёру навигатор
  periodDays: number[]; // отмеченные дни месячных (приливный круг, только на устройстве)
  setPeriodDays: (days: number[]) => void;
  periodEnded: boolean; // «закончились сегодня» — период закрыт явно
  setPeriodEnded: (v: boolean) => void;
  cycleHistory: string[]; // история стартов (ISO) — только на устройстве
  recordCycleStart: (iso: string) => void;
  needsSpace: boolean; // «не трогать» — отметка на сегодня
  setNeedsSpace: (v: boolean) => void;
  dayStates: Record<string, string>; // день → red|yellow|green (самочувствие)
  setDayState: (day: number, color: string) => void;
  careProfile: CareProfile;
  careProfileDirty: boolean; // true = локально заполнен, ещё не отправлен
  setLastPeriod: (iso: string) => void;
  clearLastPeriod: () => void;
  setMood: (m: Mood) => void;
  setCycleDayVisible: (v: boolean) => void;
  addCozy: (text: string) => void;
  removeCozy: (text: string) => void;
  setPasswordPhrase: (text: string) => void;
  setSuperpower: (text: string) => void;
  toggleCare: (group: keyof CareProfile, id: string) => void;
  setCustom: (text: string) => void;
  markCareSynced: () => void;
  resetDevice: () => void;
}

const emptyProfile: CareProfile = { food: [], space: [], words: [], custom: "" };

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      phase: null,
      mood: null,
      lastPeriodStart: null,
      cycleDay: null,
      cycleDayVisible: false,
      periodDays: [],
      periodEnded: false,
      cycleHistory: [],
      needsSpace: false,
      dayStates: {},
      careProfile: emptyProfile,
      careProfileDirty: false,

      setLastPeriod: (iso) =>
        set({
          lastPeriodStart: iso,
          phase: phaseFromStartDate(iso),
          cycleDay: dayOfCycle(iso),
        }),

      clearLastPeriod: () => set({ lastPeriodStart: null, phase: null, cycleDay: null }),

      setMood: (m) => set({ mood: m }),

      setCycleDayVisible: (v) => set({ cycleDayVisible: v }),

      setPeriodDays: (days) => set({ periodDays: [...new Set(days)].sort((a, b) => a - b) }),
      setPeriodEnded: (v) => set({ periodEnded: v }),

      recordCycleStart: (iso) =>
        set((s) => {
          if (s.cycleHistory[s.cycleHistory.length - 1] === iso) return s;
          return { cycleHistory: [...s.cycleHistory.filter((x) => x !== iso), iso] };
        }),

      setNeedsSpace: (v) => set({ needsSpace: v }),

      setDayState: (day, color) =>
        set((s) => ({ dayStates: { ...s.dayStates, [String(day)]: color } })),

      addCozy: (text) => {
        const t = text.trim();
        if (!t) return;
        const cozy = get().careProfile.cozy ?? [];
        if (cozy.length >= 6 || cozy.includes(t)) return;
        set({ careProfile: { ...get().careProfile, cozy: [...cozy, t] } });
      },

      removeCozy: (text) =>
        set({
          careProfile: {
            ...get().careProfile,
            cozy: (get().careProfile.cozy ?? []).filter((c) => c !== text),
          },
        }),

      setPasswordPhrase: (text) =>
        set({ careProfile: { ...get().careProfile, passwordPhrase: text } }),

      setSuperpower: (text) =>
        set({ careProfile: { ...get().careProfile, superpower: text } }),

      toggleCare: (group, id) => {
        if (group === "custom" || group === "passwordPhrase" || group === "superpower") return;
        const cur = get().careProfile[group] ?? [];
        if (!Array.isArray(cur)) return;
        const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
        set({ careProfile: { ...get().careProfile, [group]: next }, careProfileDirty: true });
      },

      setCustom: (text) =>
        set({ careProfile: { ...get().careProfile, custom: text }, careProfileDirty: true }),

      markCareSynced: () => set({ careProfileDirty: false }),

      resetDevice: () =>
        set({
          phase: null,
          mood: null,
          lastPeriodStart: null,
          cycleDay: null,
          cycleDayVisible: false,
          careProfile: emptyProfile,
        }),
    }),
    { name: "sync-device-v1", storage: createJSONStorage(() => cycleStorage), onRehydrateStorage: () => () => { useApp.setState({ hydrated: true }); } }
  )
);
