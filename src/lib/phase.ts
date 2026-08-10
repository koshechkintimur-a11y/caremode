// Расчёт фазы и дня цикла — ТОЛЬКО на устройстве OWNER.
// На сервер уходит фаза и (по согласию) простое число «день цикла» — без дат.

export type Phase = "MENSTRUAL" | "FOLLICULAR" | "OVULATION" | "LUTEAL" | "UNKNOWN";

const DAY = 86_400_000;
export const CYCLE_LENGTH = 28;

export function phaseFromStartDate(startISO: string, today: Date = new Date()): Phase | null {
  const d = dayOfCycle(startISO, today);
  if (d === null) return null;
  return phaseOfDay(d);
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

// Что это значит подробнее (для инфо-блока «по фазам»)
export const PHASE_DETAIL: Record<Phase, string> = {
  MENSTRUAL: "Организм обновляется: энергии мало, тянет на солёное и сладкое, хочется тепла и тишины. Ей может быть физически тяжело — меньше слов, больше заботы.",
  FOLLICULAR: "Самочувствие на подъёме: энергия возвращается, настроение выравнивается. Хорошее время предлагать планы — она скорее скажет «да».",
  OVULATION: "Пик энергии и настроения. Это фертильное окно — лучшие дни для зачатия, если вы планируете беременность. Комплименты и свидания зайдут лучше всего.",
  LUTEAL: "Ближе к концу цикла может нарастать усталость и раздражительность — это нормально и не про тебя. Меньше слов, больше действий: еда, тепло, забота без вопросов.",
  UNKNOWN: "Она пока не поделилась данными цикла.",
};

export const PHASE_COLOR: Record<Phase, string> = {
  MENSTRUAL: "var(--primary)",
  FOLLICULAR: "var(--accent)",
  OVULATION: "var(--success)",
  LUTEAL: "var(--lilac)",
  UNKNOWN: "var(--muted)",
};

// Единая функция фазы: LUTEAL без верхней границы (циклы бывают 35–45 дней —
// это всё ещё «перед циклом», а не «без данных»).
export function phaseOfDay(day: number): Phase {
  if (day <= 0) return "UNKNOWN";
  if (day <= 5) return "MENSTRUAL";
  if (day <= 13) return "FOLLICULAR";
  if (day <= 16) return "OVULATION";
  return "LUTEAL";
}
