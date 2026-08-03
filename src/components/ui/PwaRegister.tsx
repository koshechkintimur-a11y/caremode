"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Регистрация service worker + iOS-подсказка «добавь на главный экран»
// (Web Push на iOS работает ТОЛЬКО из установленного PWA-ярлыка, 16.4+).
const HINT_KEY = "sync-ios-hint";

function isIosPwaCandidate(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua);
  const standalone = "standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true;
  return iOS && !standalone;
}

export function PwaRegister() {
  const [showHint, setShowHint] = useState(false);

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

    // iOS: показываем подсказку установки один раз, с задержкой (не в первую секунду)
    if (isIosPwaCandidate()) {
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(HINT_KEY) === "1";
      } catch {
        /* приватный режим — покажем снова */
      }
      if (!dismissed) {
        const t = setTimeout(() => setShowHint(true), 3500);
        return () => clearTimeout(t);
      }
    }
  }, []);

  function done() {
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {}
    setShowHint(false);
  }

  return (
    <AnimatePresence>
      {showHint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/50 flex items-end justify-center"
          onClick={done}
        >
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 60 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-md bg-surface rounded-t-[28px] p-6 pb-9"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-line mx-auto" />
            <h2 className="mt-4 text-[20px] font-extrabold text-ink text-center">
              Поставь CareMode на главный экран
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-muted text-center">
              Тогда подсказки будут приходить как уведомления
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-2xl bg-bg px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center text-[16px] shrink-0">
                  📤
                </div>
                <div className="text-[13px] font-bold text-ink leading-snug">
                  Нажми <span className="text-primary">«Поделиться»</span> в Safari
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-bg px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center text-[16px] shrink-0">
                  🏠
                </div>
                <div className="text-[13px] font-bold text-ink leading-snug">
                  Выбери <span className="text-primary">«На экран „Домой“»</span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-bg px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center text-[16px] shrink-0">
                  ✅
                </div>
                <div className="text-[13px] font-bold text-ink leading-snug">
                  Открывай с ярлыка — и уведомления заработают
                </div>
              </div>
            </div>

            <button
              onClick={done}
              className="mt-5 w-full h-[52px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[15px] shadow-[0_8px_24px_rgba(232,131,127,.4)] active:scale-[.97] transition"
            >
              Готово
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
