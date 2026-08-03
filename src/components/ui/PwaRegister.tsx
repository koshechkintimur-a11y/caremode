"use client";

import { useEffect } from "react";

// SW живёт ТОЛЬКО в production. В dev он кэширует старые чанки (CacheFirst),
// тормозит HMR и при рестарте сервера сыпет «Failed to fetch» —
// поэтому в dev принудительно выпиливаем любые старые регистрации и кэши.
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister()));
      caches
        .keys()
        .then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
        .catch(() => {});
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
