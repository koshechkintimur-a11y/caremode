"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Пиксельное сердечко 7×6 (как в логотипе)
const HEART_ROWS = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];

function PixelHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="30" height="26" viewBox="0 0 8 7" style={{ imageRendering: "pixelated" }} aria-hidden>
      {HEART_ROWS.map((row, ry) =>
        row.split("").map((c, rx) =>
          c === "X" ? (
            <rect
              key={`${ry}-${rx}`}
              x={rx}
              y={ry}
              width={1}
              height={1}
              fill={filled ? "#E8837F" : "rgba(139,115,128,.25)"}
            />
          ) : null
        )
      )}
    </svg>
  );
}

// «Оцените приложение»: через сутки после первого захода — 5 пиксельных сердечек.
const KEY_SEEN = "cm-rated-seen"; // "later-<ts>" | "never" | "rated" | "1..5"

export function RateModal() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const mark = localStorage.getItem("cm-first-seen");
    const now = Date.now();
    if (!mark) {
      localStorage.setItem("cm-first-seen", String(now));
      return;
    }
    const seen = localStorage.getItem(KEY_SEEN);
    if (seen === "never" || seen === "rated") return;
    if (seen?.startsWith("later-") && now - Number(seen.slice(6)) < 7 * 86_400_000) return;
    // показ не чаще раза в день (даже без ответа) — иначе «вылезает при каждом обновлении»
    const todayKey = `cm-rate-shown-${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(todayKey)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- отложенный показ модалки
    if (now - Number(mark) >= 86_400_000) {
      localStorage.setItem(todayKey, String(now));
      setOpen(true);
    }

    // ручной вызов из Настроек («Оценить приложение»)
    const onOpen = () => setOpen(true);
    window.addEventListener("cm-open-rate", onOpen);
    return () => window.removeEventListener("cm-open-rate", onOpen);
  }, []);

  if (!open) return null;

  const submit = (stars: number) => {
    localStorage.setItem(KEY_SEEN, stars >= 5 ? "rated" : String(stars));
    setRating(stars);
    // оценка уходит на сервер (аналитика/админка)
    void fetch("/api/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars }),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => {
        if (rating === 0) {
          localStorage.setItem(KEY_SEEN, `later-${Date.now()}`);
          setOpen(false);
        }
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[24px] bg-surface p-6 shadow-[0_16px_48px_rgba(0,0,0,.3)] text-center"
      >
        {rating === 0 ? (
          <>
            <div className="text-[18px] font-extrabold text-ink">Нравится CareMode?</div>
            <div className="text-[13px] font-semibold text-muted mt-1">
              Твоя оценка помогает нам делать приложение лучше 💛
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} onClick={() => setRating(i)} aria-label={`Оценка ${i}`} className="active:scale-90 transition">
                  <PixelHeart filled={i <= rating} />
                </button>
              ))}
            </div>
            <div className="mt-3 text-[12px] font-bold text-muted">тапни по сердечкам</div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  localStorage.setItem(KEY_SEEN, `later-${Date.now()}`);
                  setOpen(false);
                }}
                className="flex-1 h-[44px] rounded-full border border-line text-[13px] font-bold text-muted active:scale-[.97] transition"
              >
                Позже
              </button>
              <button
                onClick={() => {
                  localStorage.setItem(KEY_SEEN, "never");
                  setOpen(false);
                }}
                className="flex-1 h-[44px] rounded-full border border-line text-[13px] font-bold text-muted active:scale-[.97] transition"
              >
                Не спрашивать
              </button>
            </div>
            {rating > 0 && (
              <button
                onClick={() => submit(rating)}
                className="mt-2 w-full h-[46px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[14px] active:scale-[.97] transition"
              >
                Отправить
              </button>
            )}
          </>
        ) : rating >= 5 ? (
          <>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <PixelHeart key={i} filled />
              ))}
            </div>
            <div className="text-[18px] font-extrabold text-ink mt-4">Ура! 🎉</div>
            <div className="text-[13px] font-semibold text-muted mt-1">
              Поделись CareMode с парой, которая это заслужила.
            </div>
            <button
              onClick={async () => {
                try {
                  await navigator.share?.({ title: "CareMode", text: "Приложение для пар: меньше угадываний — больше заботы 💛", url: "https://caremode.ru" });
                } catch {}
                localStorage.setItem(KEY_SEEN, "rated");
                setOpen(false);
              }}
              className="mt-4 w-full h-[46px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[14px] active:scale-[.97] transition"
            >
              Поделиться 💛
            </button>
            <a
              href="https://t.me/caremode_app"
              target="_blank"
              rel="noreferrer"
              className="mt-2 w-full h-[44px] rounded-full bg-[#2AABEE] text-white font-extrabold text-[13px] flex items-center justify-center active:scale-[.97] transition"
            >
              Подписаться на канал ✈️
            </a>
            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full h-[40px] rounded-full text-[12px] font-bold text-muted active:scale-[.97] transition"
            >
              Закрыть
            </button>
          </>
        ) : (
          <>
            <div className="text-[18px] font-extrabold text-ink">Спасибо за честность 💛</div>
            <div className="text-[13px] font-semibold text-muted mt-1">
              Напиши нам, что улучшить — читаем каждое сообщение.
            </div>
            <a
              href="https://t.me/caremode_bot"
              target="_blank"
              rel="noreferrer"
              className="mt-4 w-full h-[46px] rounded-full bg-[#2AABEE] text-white font-extrabold text-[13px] flex items-center justify-center active:scale-[.97] transition"
            >
              Написать в Telegram ✈️
            </a>
            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full h-[40px] rounded-full text-[12px] font-bold text-muted active:scale-[.97] transition"
            >
              Закрыть
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
