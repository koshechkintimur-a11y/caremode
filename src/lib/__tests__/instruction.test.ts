import { describe, it, expect } from "vitest";
import { genitive } from "@/lib/instruction";

// Родительный падеж — «Послание Оли», «Пригласить Диму», сертификаты.
describe("genitive", () => {
  it("имена на -а/-я", () => {
    expect(genitive("Оля")).toBe("Оли");
    expect(genitive("Настя")).toBe("Насти");
  });

  it("имена на -й", () => {
    expect(genitive("Дима")).toBe("Димы"); // исключение
    expect(genitive("Андрей")).toBe("Андрея");
  });

  it("согласные — +а", () => {
    expect(genitive("Сергей")).toBe("Сергея");
  });

  it("исключения", () => {
    expect(genitive("Вова")).toBe("Вовы");
    expect(genitive("Павел")).toBe("Павла");
  });

  it("пустое имя — пустая строка", () => {
    expect(genitive(null)).toBe("");
    expect(genitive("")).toBe("");
  });
});
