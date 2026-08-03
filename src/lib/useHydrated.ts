"use client";

import { useSyncExternalStore } from "react";

// Канонический детектор гидрации: false на сервере, true на клиенте.
// Без useEffect/setState — lint-чисто.
const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
