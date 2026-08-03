import { describe, it, expect } from "vitest";
import { phaseFromStartDate, dayOfCycle, phaseOfDay } from "@/lib/phase";

// Фазы и день цикла — основа генерации карточек и навигатора.
const START = "2026-08-01";

describe("dayOfCycle", () => {
  it("день 1 в день старта", () => {
    expect(dayOfCycle(START, new Date("2026-08-01T12:00:00"))).toBe(1);
  });

  it("день 3 через два дня", () => {
    expect(dayOfCycle(START, new Date("2026-08-03T12:00:00"))).toBe(3);
  });

  it("null без даты старта", () => {
    expect(dayOfCycle("", new Date("2026-08-03T12:00:00"))).toBeNull();
  });
});

describe("phaseFromStartDate", () => {
  it("менструальная в первые дни (день 2)", () => {
    expect(phaseFromStartDate(START, new Date("2026-08-02T12:00:00"))).toBe("MENSTRUAL");
  });

  it("фолликулярная после месячных (день 8)", () => {
    expect(phaseFromStartDate(START, new Date("2026-08-08T12:00:00"))).toBe("FOLLICULAR");
  });

  it("лютеиновая после овуляции (день 20)", () => {
    expect(phaseFromStartDate(START, new Date("2026-08-20T12:00:00"))).toBe("LUTEAL");
  });
});

describe("phaseOfDay", () => {
  it("маппинг дня в фазу по диапазонам", () => {
    expect(phaseOfDay(1)).toBe("MENSTRUAL");
    expect(phaseOfDay(8)).toBe("FOLLICULAR");
    expect(phaseOfDay(14)).toBe("OVULATION");
    expect(phaseOfDay(21)).toBe("LUTEAL");
  });
});
