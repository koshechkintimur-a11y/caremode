"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayOfCycle } from "@/lib/phase";

// 3D-карусель дней: реальный календарь (вчера · сегодня · завтра).
// Карточка = календарная дата + день цикла + цвет самочувствия.
// Тап по центральной карточке = цикл цвета: красный (всё болит) →
// жёлтый (терпимо) → зелёный (хорошо) → красный. Партнёр видит цвета у себя.
// Пиксельный стиль: PICO-8 палитра, фаска-«продавливание», Press Start 2P.

const PAL = {
  red: "#FF004D",
  yellow: "#FFEC27",
  green: "#00E436",
  dark: "#5F574F",
  cream: "#FFF1E8",
  gray: "#C2C3C7",
};

const DAY_LABEL = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const CYCLE = ["red", "yellow", "green"] as const;

export const DAY_COLORS: Record<string, string> = {
  red: PAL.red,
  yellow: PAL.yellow,
  green: PAL.green,
};

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function shift(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return localISO(d);
}

export function DayCarousel({
  periodDays,
  dayStates,
  lastPeriodStart,
  onDayState,
}: {
  periodDays: number[];
  dayStates: Record<string, string>;
  lastPeriodStart: string | null;
  onDayState?: (day: number, color: string) => void;
}) {
  const today = localISO(new Date());
  const [centerISO, setCenterISO] = useState(today);

  const dateOf = (d: string) => {
    const dt = parseISO(d);
    return { dd: String(dt.getDate()).padStart(2, "0"), wd: DAY_LABEL[dt.getDay()] };
  };
  const cycleDayOf = (d: string): number | null => {
    if (!lastPeriodStart) return null;
    return dayOfCycle(lastPeriodStart, parseISO(d));
  };
  const colorOf = (d: string): string => {
    const n = cycleDayOf(d);
    if (n === null) return PAL.gray;
    const custom = dayStates[String(n)];
    if (custom) return PAL[custom as keyof typeof PAL] ?? PAL.gray;
    return periodDays.includes(n) ? PAL.red : PAL.green;
  };

  const dates = [shift(centerISO, -1), centerISO, shift(centerISO, 1)];
  const isCenterToday = centerISO === today;

  function step(dir: 1 | -1) {
    setCenterISO(shift(centerISO, dir));
  }

  function tapDate(iso: string, idx: number) {
    if (idx !== 1) {
      setCenterISO(iso);
      return;
    }
    if (!onDayState) return;
    const n = cycleDayOf(iso);
    if (n === null) return;
    const cur = dayStates[String(n)] ?? (periodDays.includes(n) ? "red" : "green");
    const next = CYCLE[(CYCLE.indexOf(cur as (typeof CYCLE)[number]) + 1) % CYCLE.length];
    onDayState(n, next);
  }

  return (
    <div className="w-full flex flex-col items-center gap-3 select-none" style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}>
      {/* карточки: вчера · сегодня · завтра */}
      <div className="relative w-full h-[132px] flex items-center justify-center" style={{ perspective: 600 }}>
        {dates.map((iso, idx) => {
          const off = idx - 1;
          const { dd, wd } = dateOf(iso);
          const n = cycleDayOf(iso);
          const color = colorOf(iso);
          const isToday = iso === today;
          return (
            <motion.button
              key={iso}
              drag={off === 0 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.08}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 40 || Math.abs(info.velocity.x) > 300) {
                  step(info.offset.x < 0 ? 1 : -1);
                }
              }}
              onClick={() => tapDate(iso, idx)}
              className="absolute top-1/2"
              style={{
                y: "-50%",
                x: off * 92,
                rotateY: off * -28,
                scale: 1 - Math.abs(off) * 0.14,
                zIndex: off === 0 ? 10 : 0,
                opacity: off === 0 ? 1 : 0.65,
              }}
              whileTap={{ scale: (1 - Math.abs(off) * 0.14) * 0.94 }}
            >
              <div
                className={cn(
                  "w-[84px] h-[112px] rounded-[14px] flex flex-col items-center justify-center gap-1.5 relative",
                  "border-2",
                  off === 0 ? "border-[#FFF1E8]/90" : "border-black/10"
                )}
                style={{
                  background: color,
                  boxShadow: `0 5px 0 ${PAL.dark}, 0 8px 0 rgba(0,0,0,.18)`,
                }}
              >
                {/* пиксельный блик */}
                <div className="absolute top-1.5 left-1.5 w-4 h-1.5 rounded-[3px] bg-white/35" />
                <span className="font-pixel text-white text-[17px] leading-none drop-shadow-[0_2px_0_rgba(0,0,0,.35)]">
                  {dd}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/90">
                  {wd}
                </span>
                {n !== null ? (
                  <span className="mt-0.5 px-1.5 py-0.5 rounded-[4px] bg-black/25 text-[9px] font-bold text-white/95">
                    день {n}
                  </span>
                ) : (
                  <span className="mt-0.5 text-[9px] font-bold text-white/70">—</span>
                )}
                {isToday && (
                  <span
                    className="absolute -top-2.5 px-2 py-0.5 rounded-[4px] text-[9px] font-pixel"
                    style={{ background: PAL.dark, color: PAL.cream, boxShadow: "0 2px 0 rgba(0,0,0,.3)" }}
                  >
                    СЕГОДНЯ
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* стрелки */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => step(-1)}
          className="w-9 h-9 rounded-[10px] bg-surface border-2 border-line flex items-center justify-center active:translate-y-[2px] transition-transform"
          style={{ boxShadow: "0 3px 0 rgba(0,0,0,.12)" }}
          aria-label="Вчера"
        >
          <ChevronLeft size={16} className="text-muted" />
        </button>
        <div className="text-[13px] font-extrabold text-ink">
          {isCenterToday ? "сегодня" : dateOf(centerISO).dd + " " + dateOf(centerISO).wd}
        </div>
        <button
          onClick={() => step(1)}
          className="w-9 h-9 rounded-[10px] bg-surface border-2 border-line flex items-center justify-center active:translate-y-[2px] transition-transform"
          style={{ boxShadow: "0 3px 0 rgba(0,0,0,.12)" }}
          aria-label="Завтра"
        >
          <ChevronRight size={16} className="text-muted" />
        </button>
      </div>

      {/* легенда — отдельной строкой, не пересекается с карточками */}
      <div className="flex items-center gap-3 text-[11px] font-bold text-muted">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[4px]" style={{ background: PAL.red }} /> болит</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[4px]" style={{ background: PAL.yellow }} /> терпимо</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[4px]" style={{ background: PAL.green }} /> хорошо</span>
      </div>
      <div className="text-[12px] font-semibold text-muted text-center">
        тап по дню — изменить самочувствие · он видит цвета у себя
      </div>
    </div>
  );
}
