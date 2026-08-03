// Статистика цикла — только на устройстве (история стартов в localStorage).
// Никаких дат на сервер: партнёр видит лишь день и фазу.

const DAY = 86_400_000;
const MIN_LEN = 14;
const MAX_LEN = 60;

export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Средняя длина цикла по истории стартов (дни). Нет данных → 28. */
export function avgCycleLen(history: string[]): number {
  if (history.length < 2) return 28;
  const diffs: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const d = Math.round(
      (new Date(history[i] + "T00:00:00").getTime() -
        new Date(history[i - 1] + "T00:00:00").getTime()) /
        DAY
    );
    if (d >= MIN_LEN && d <= MAX_LEN) diffs.push(d);
  }
  if (!diffs.length) return 28;
  return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
}

export interface CycleStats {
  avgLen: number;
  dayNow: number | null;
  nextStart: Date | null;
  daysUntilNext: number | null; // <0 = ожидаемый старт уже позади (позже обычного)
}

export function computeCycleStats(
  history: string[],
  currentStartIso: string | null,
  today: Date = new Date()
): CycleStats {
  const starts = [...(history ?? []), currentStartIso].filter(
    (s): s is string => Boolean(s)
  );
  const avgLen = avgCycleLen(starts);

  if (!currentStartIso) return { avgLen, dayNow: null, nextStart: null, daysUntilNext: null };

  const start = new Date(currentStartIso + "T00:00:00");
  const dayNow = Math.floor((today.getTime() - start.getTime()) / DAY) + 1;
  const nextStart = new Date(start.getTime() + avgLen * DAY);
  const daysUntilNext = Math.floor((nextStart.getTime() - today.getTime()) / DAY);
  return { avgLen, dayNow, nextStart, daysUntilNext };
}
