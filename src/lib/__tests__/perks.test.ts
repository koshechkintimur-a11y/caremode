import { describe, it, expect } from "vitest";
import { getPerk, nextPerk } from "@/lib/perks";

// Пороги перков: 5/10/15/25/40 GOOD — критичная бизнес-логика геймификации.
describe("getPerk", () => {
  it("возвращает null без GOOD", () => {
    expect(getPerk(0)).toBeNull();
    expect(getPerk(4)).toBeNull();
  });

  it("Стажёр открывается на 5", () => {
    expect(getPerk(5)?.title).toBe("Стажёр");
    expect(getPerk(9)?.title).toBe("Стажёр");
  });

  it("пороги 10/15/25/40 срабатывают ровно на границе", () => {
    expect(getPerk(10)?.title).toBe("В теме");
    expect(getPerk(15)?.title).toBe("Хранитель тишины");
    expect(getPerk(25)?.title).toBe("Читает её");
    expect(getPerk(40)?.title).toBe("Тот самый");
  });

  it("не откатывается при росте GOOD", () => {
    expect(getPerk(16)?.title).toBe("Хранитель тишины");
    expect(getPerk(41)?.title).toBe("Тот самый");
  });
});

describe("nextPerk", () => {
  it("показывает следующий перк и порог", () => {
    expect(nextPerk(0)?.at).toBe(5);
    expect(nextPerk(16)?.title).toBe("Читает её");
    expect(nextPerk(16)?.at).toBe(25);
  });

  it("на максимуме — null", () => {
    expect(nextPerk(40)).toBeNull();
    expect(nextPerk(99)).toBeNull();
  });
});
