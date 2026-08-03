"use client";

import { create } from "zustand";

// Пиксельная погода: какое состояние океана рисовать.
// Публикует today-страница: OWNER — её настроение, PARTNER — фаза цикла.
export type WeatherKey = "storm" | "rain" | "clouds" | "sun";

interface WeatherState {
  weather: WeatherKey;
  setWeather: (w: WeatherKey) => void;
}

export const useWeather = create<WeatherState>((set) => ({
  weather: "clouds",
  setWeather: (w) => set({ weather: w }),
}));

// Маппинг настроения OWNER → погода
export const MOOD_WEATHER: Record<string, WeatherKey> = {
  TERRIBLE: "storm",
  MEH: "rain",
  GREAT: "sun",
};

// Маппинг фазы цикла → погода (для PARTNER, который не видит настроение)
export const PHASE_WEATHER: Record<string, WeatherKey> = {
  MENSTRUAL: "storm",
  LUTEAL: "rain",
  FOLLICULAR: "clouds",
  OVULATION: "sun",
  UNKNOWN: "clouds",
};
