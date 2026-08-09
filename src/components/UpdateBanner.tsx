"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Баннер «вышла новая версия»: появляется, когда service worker обновился
// (skipWaiting + очистка кэшей уже выполнены) — осталось перезагрузить страницу,
// чтобы браузер подхватил свежие чанки. Решает проблему «старого кэша» у юзеров.
const KEY = "cm-update-dismissed";

export function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(KEY);
    if (dismissed && Date.now() - Number(dismissed) < 30 * 60_000) return;

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "CM_UPDATE") setShow(true);
    };
    const onControllerChange = () => setShow(true);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);

    // страница открыта давно — проверяем сами, не обновился ли SW
    let timer: ReturnType<typeof setInterval> | undefined;
    if (navigator.serviceWorker?.getRegistration) {
      timer = setInterval(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        // новый SW ждёт (installing/installed) или уже активирован поверх старого
        if (reg?.waiting || reg?.installing) setShow(true);
      }, 20_000);
    }

    return () => {
      navigator.serviceWorker?.removeEventListener("message", onMessage);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
      if (timer) clearInterval(timer);
    };
  }, []);

  if (!show || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[9999] p-3 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto max-w-md mx-auto rounded-[24px] bg-[#1B1626] px-5 py-4 shadow-[0_8px_30px_rgba(27,22,38,.35)] border border-white/10">
        <div className="text-[14px] font-extrabold text-white">📦 Вышла новая версия</div>
        <div className="text-[12px] font-semibold text-white/70 mt-0.5 mb-3">
          Обнови, чтобы всё работало как надо — это займёт секунду
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => location.reload()}
            className="flex-1 h-[40px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[13px] active:scale-[.97] transition"
          >
            Обновить
          </button>
          <button
            onClick={() => {
              localStorage.setItem(KEY, String(Date.now()));
              setShow(false);
            }}
            className="h-[40px] px-4 rounded-full bg-white/10 text-white font-bold text-[12px] active:scale-95 transition"
          >
            Позже
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
