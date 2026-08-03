import { describe, it, expect } from "vitest";
import { computeCycleStats, avgCycleLen } from "@/lib/cycle";

// Статистика цикла — прогноз «ожидала начало N дн назад» и полоска навигатора.
describe("avgCycleLen", () => {
  it("средняя длина из истории стартов", () => {
    expect(avgCycleLen(["2026-06-01", "2026-06-29", "2026-07-27"])).toBe(28);
  });

  it("пустая история — дефолт 28", () => {
    expect(avgCycleLen([])).toBe(28);
  });
});

describe("computeCycleStats", () => {
  it("день цикла и следующий старт по средней", () => {
    const s = computeCycleStats(["2026-06-01", "2026-06-29"], "2026-07-27", new Date("2026-07-29T12:00:00"));
    expect(s.dayNow).toBe(3);
    expect(s.daysUntilNext).toBe(25);
  });

  it("без текущего старта — null-поля", () => {
    const s = computeCycleStats(["2026-06-01"], null, new Date("2026-07-29T12:00:00"));
    expect(s.dayNow).toBeNull();
    expect(s.daysUntilNext).toBeNull();
  });

  it("задержка: daysUntilNext отрицательный", () => {
    // старт 2026-07-01, средняя 28 → ожидался старт 2026-07-29, а сегодня 2026-07-31
    const s = computeCycleStats(["2026-06-03"], "2026-07-01", new Date("2026-07-31T12:00:00"));
    expect(s.daysUntilNext).toBeLessThan(0);
  });
});
