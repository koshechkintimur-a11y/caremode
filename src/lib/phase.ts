// Расчёт фазы и дня цикла — ТОЛЬКО на устройстве OWNER.
// На сервер уходит фаза и (по согласию) простое число «день цикла» — без дат.

export type Phase = "MENSTRUAL" | "FOLLICULAR" | "OVULATION" | "LUTEAL" | "UNKNOWN";

const DAY = 86_400_000;
export const CYCLE_LENGTH = 28;

export function phaseFromStartDate(startISO: string, today: Date = new Date()): Phase | null {
  const start = new Date(startISO + "T00:00:00");
  if (isNaN(start.getTime())) return null;
  const d = Math.floor((today.getTime() - start.getTime()) / DAY);
  if (d < 0) return null; // дата в будущем — просим проверить
  if (d <= 4) return "MENSTRUAL";
  if (d <= 13) return "FOLLICULAR";
  if (d <= 16) return "OVULATION";
  if (d <= 35) return "LUTEAL";
  return "UNKNOWN"; // цикл длиннее 35 дней — предложить обновить дату
}

/** День цикла (1 = первый день месячных). Без дат — просто число. */
export function dayOfCycle(startISO: string, today: Date = new Date()): number | null {
  const start = new Date(startISO + "T00:00:00");
  if (isNaN(start.getTime())) return null;
  const d = Math.floor((today.getTime() - start.getTime()) / DAY);
  if (d < 0) return null;
  return d + 1;
}

export const PHASE_LABEL: Record<Phase, string> = {
  MENSTRUAL: "первые дни",
  FOLLICULAR: "на подъёме",
  OVULATION: "пик энергии",
  LUTEAL: "перед циклом",
  UNKNOWN: "без данных",
};

// Что это значит для партнёра (поведение, не медицина)
export const PHASE_HINT: Record<Phase, string> = {
  MENSTRUAL: "нужна забота: еда, тепло, тишина",
  FOLLICULAR: "энергия растёт — можно предлагать планы",
  OVULATION: "хорошее время для комплиментов и свиданий",
  LUTEAL: "меньше слов, больше действий: терпение и еда",
  UNKNOWN: "она пока не поделилась данными",
};

// Сегменты навигатора: диапазоны дней цикла по фазам
export const PHASE_RANGES: { phase: Phase; from: number; to: number }[] = [
  { phase: "MENSTRUAL", from: 1, to: 5 },
  { phase: "FOLLICULAR", from: 6, to: 13 },
  { phase: "OVULATION", from: 14, to: 16 },
  { phase: "LUTEAL", from: 17, to: 28 },
];

export const PHASE_COLOR: Record<Phase, string> = {
  MENSTRUAL: "var(--primary)",
  FOLLICULAR: "var(--accent)",
  OVULATION: "var(--success)",
  LUTEAL: "var(--lilac)",
  UNKNOWN: "var(--muted)",
};

export function phaseOfDay(day: number): Phase {
  for (const r of PHASE_RANGES) {
    if (day >= r.from && day <= r.to) return r.phase;
  }
  return "UNKNOWN";
}
