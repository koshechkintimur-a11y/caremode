"use client";

import { phaseOfDay, CYCLE_LENGTH, PHASE_HINT, PHASE_LABEL, type Phase } from "@/lib/phase";

// Полоска-прогресс цикла для партнёра: 28 сегментов.
// Цвет сегмента = её самочувствие в этот день (красный — болит,
// жёлтый — терпимо, зелёный — хорошо); без меток — цвет фазы. Без дат.
export function CycleProgress({
  day,
  dayStates = {},
}: {
  day: number | null;
  dayStates?: Record<string, string>;
}) {
  const phase: Phase = day ? phaseOfDay(day) : "UNKNOWN";
  const colorOf = (d: number): string => {
    const c = dayStates[String(d)];
    if (c === "red") return "#E05C5C";
    if (c === "yellow") return "#F2C94C";
    if (c === "green") return "#7ED17E";
    const p = phaseOfDay(d);
    return p === "MENSTRUAL" ? "#E8837F" : p === "FOLLICULAR" ? "#7ED17E" : p === "OVULATION" ? "#F2C94C" : "#8FA8C8";
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-extrabold text-ink">
          {day ? `день ${day}` : "—"} · {PHASE_LABEL[phase]}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted">
          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-[#E05C5C]" /> болит</span>
          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-[#F2C94C]" /> терпимо</span>
          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-[#7ED17E]" /> хорошо</span>
        </div>
      </div>
      <div className="flex gap-[3px]">
        {Array.from({ length: CYCLE_LENGTH }, (_, i) => {
          const n = i + 1;
          return (
            <div
              key={n}
              className="h-[10px] flex-1 rounded-[3px]"
              style={{
                background: colorOf(n),
                opacity: day === n ? 1 : 0.55,
                outline: day === n ? "2px solid var(--ink)" : "none",
                outlineOffset: 1,
              }}
            />
          );
        })}
      </div>
      <div className="text-[12px] font-bold text-muted">{PHASE_HINT[phase]}</div>
    </div>
  );
}
