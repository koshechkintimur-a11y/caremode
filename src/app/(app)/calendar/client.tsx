"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/store/useApp";
import { cn } from "@/lib/utils";

// Календарь-история цикла: только на устройстве (localStorage).
// Отмечены: старты циклов, дни месячных текущего цикла, цвета самочувствия.

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const WD = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const startIdx = (first.getDay() + 6) % 7; // понедельник = 0
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startIdx; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarClient() {
  const store = useApp();
  const hydrated = useApp((s) => s.hydrated);
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const starts = new Set(hydrated ? store.cycleHistory : []);
  const periodDays = hydrated ? store.periodDays : [];
  const dayStates = hydrated ? store.dayStates : {};
  const lastStart = hydrated ? store.lastPeriodStart : null;

  // даты дней текущего цикла (для отрисовки периода и цветов)
  const periodDates = new Map<string, string>(); // YYYY-MM-DD → цвет
  if (lastStart) {
    const base = new Date(lastStart + "T00:00:00");
    periodDays.forEach((d) => {
      const dt = new Date(base);
      dt.setDate(base.getDate() + (d - 1));
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      const custom = dayStates[String(d)];
      periodDates.set(iso, custom === "red" ? "#E05C5C" : custom === "yellow" ? "#F2C94C" : custom === "green" ? "#7ED17E" : "#E8837F");
    });
  }

  function step(dir: 1 | -1) {
    setCursor((c) => {
      const m = c.m + dir;
      if (m < 0) return { y: c.y - 1, m: 11 };
      if (m > 11) return { y: c.y + 1, m: 0 };
      return { y: c.y, m };
    });
  }

  const cells = monthGrid(cursor.y, cursor.m);
  const isoOf = (d: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center active:scale-95 transition"
          aria-label="Назад"
        >
          <ChevronLeft size={17} className="text-muted" />
        </Link>
        <h1 className="text-[18px] font-extrabold text-ink">Календарь цикла</h1>
        <div className="w-10" />
      </div>

      {/* статистика */}
      <div className="rounded-[24px] bg-surface p-5 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
        <div className="text-[14px] font-extrabold text-ink">Твоя история</div>
        <div className="mt-2 text-[12px] font-semibold text-muted leading-relaxed">
          {store.cycleHistory.length > 0 ? (
            <>
              Цикл начинался {store.cycleHistory.length === 1 ? "1 раз" : `${store.cycleHistory.length} раза`}:
              {" "}
              {[...store.cycleHistory]
                .slice(-6)
                .reverse()
                .map((iso) => {
                  const [, m, d] = iso.split("-");
                  return `${d}.${m}`;
                })
                .join(" · ")}
            </>
          ) : (
            "Отметь начало месячных — и история начнёт собираться здесь (хранится только на устройстве)"
          )}
        </div>
      </div>

      {/* месяц */}
      <div className="rounded-[24px] bg-surface p-5 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => step(-1)} className="w-9 h-9 rounded-full bg-bg flex items-center justify-center active:scale-95 transition" aria-label="Предыдущий месяц">
            <ChevronLeft size={16} className="text-muted" />
          </button>
          <div className="text-[15px] font-extrabold text-ink">
            {MONTHS[cursor.m]} {cursor.y}
          </div>
          <button onClick={() => step(1)} className="w-9 h-9 rounded-full bg-bg flex items-center justify-center active:scale-95 transition" aria-label="Следующий месяц">
            <ChevronRight size={16} className="text-muted" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {WD.map((w) => (
            <div key={w} className="text-[10px] font-bold uppercase text-muted py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const iso = isoOf(d);
            const isStart = starts.has(iso);
            const periodColor = periodDates.get(iso);
            const isToday = iso === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            return (
              <div
                key={i}
                className={cn(
                  "relative h-9 rounded-[10px] flex items-center justify-center text-[12px] font-bold",
                  periodColor ? "text-white" : "text-ink"
                )}
                style={{
                  background: periodColor ?? "transparent",
                  boxShadow: isToday ? "inset 0 0 0 2px var(--ink)" : undefined,
                }}
              >
                {d}
                {isStart && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#E05C5C] border-2 border-surface" />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] font-bold text-muted">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#E05C5C]" /> старт цикла</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#E8837F]" /> месячные</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#F2C94C]" /> терпимо</span>
        </div>
      </div>
    </div>
  );
}
