import type { CareProfile } from "@/lib/fallback";
import { CARE_GROUPS, DONT_GROUP } from "@/lib/careOptions";

// «Инструкция к ней»: собирается из профиля заботы (единый источник).
// Используется на /instruction (свиток) и для canvas-шеринга.

// маппинг id → человекочитаемый лейбл (в БД хранятся id карточек)
function labelOf(key: "food" | "space" | "words" | "dont", id: string): string {
  const group =
    key === "dont"
      ? DONT_GROUP
      : CARE_GROUPS.find((g) => g.key === key);
  const opt = group?.options.find((o) => o.id === id);
  return opt?.label ?? id;
}

// родительный падеж для русских имён (Оля→Оли, Дима→Димы, Сергей→Сергея)
const GEN_EXCEPTIONS: Record<string, string> = {
  Дима: "Димы",
  Никита: "Никиты",
  Вова: "Вовы",
  Лёва: "Лёвы",
  Тёма: "Тёмы",
  Артём: "Артёма",
  Лев: "Льва",
  Павел: "Павла",
};

export function genitive(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "";
  if (GEN_EXCEPTIONS[n]) return GEN_EXCEPTIONS[n];
  const last = n[n.length - 1];
  if (last === "а" || last === "я") return n.slice(0, -1) + "и";
  if (last === "й") return n.slice(0, -1) + "я";
  return n + "а";
}

export interface Instruction {
  do: string[]; // «Делать»
  dont: string[]; // «Не делать»
  passwordPhrase: string | null;
  superpower: string | null;
  updatedDaysAgo: number;
  ownerName: string | null;
}

const DEFAULT_DONT = [
  "Не спрашивать «что случилось?»",
  "Не давать советы, когда просят просто обнять",
  "Не паниковать и не делать вид, что всё нормально",
];

export function buildInstruction(
  care: CareProfile,
  updatedAt: Date,
  ownerName: string | null
): Instruction {
  const doList: string[] = [
    ...(care.food ?? []).map((f) => `Принести: ${labelOf("food", f)}`),
    ...(care.space ?? []).map((s) => labelOf("space", s)),
    ...(care.words ?? []).map((w) => `Сказать: ${labelOf("words", w)}`),
    ...(care.cozy ?? []),
  ];
  if (care.custom) doList.push(care.custom);

  const dont = [...DEFAULT_DONT, ...(care.dont ?? []).map((d) => labelOf("dont", d))];

  const daysAgo = Math.max(
    0,
    Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000)
  );

  return {
    do: doList.filter(Boolean),
    dont,
    passwordPhrase: care.passwordPhrase ?? null,
    superpower: care.superpower ?? null,
    updatedDaysAgo: daysAgo,
    ownerName,
  };
}

// Текстовая версия для canvas-карточки
export function instructionToText(ins: Instruction): string {
  const lines = [
    `КАК ЗАБОТИТЬСЯ ОБО МНЕ · личная шпаргалка${genitive(ins.ownerName) ? ` ${genitive(ins.ownerName)}` : ""}`,
    "",
    "ДЕЛАТЬ:",
    ...ins.do.map((d) => `• ${d}`),
    "",
    "НЕ ДЕЛАТЬ:",
    ...ins.dont.map((d) => `✕ ${d}`),
  ];
  if (ins.passwordPhrase) {
    lines.push("", `ФРАЗА-ПАРОЛЬ: ${ins.passwordPhrase}`);
  }
  if (ins.superpower) {
    lines.push("", `СУПЕРСИЛА: ${ins.superpower}`);
  }
  return lines.join("\n");
}
