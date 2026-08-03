import "server-only";

// Постфильтр: защита от токсичных/стереотипных формулировок.
// Сработал → регенерация со строгим промптом → фолбэк-библиотека.

const BLOCK_WORDS = [
  "вес",
  "диет",
  "похуд",
  "истерик",
  "гормон", // в уничижительном смысле (в связке ниже)
  "пмс",
  "потерпи",
  "успокойс",
  "не выдумыва",
  "всё женщины",
  "все женщины",
  "твоя девушка должна",
  "она должна",
  "не будь такой",
  "прекрати",
  "перестань",
];

const BLOCK_PHRASES = ["это всё гормоны", "из-за гормонов", "просто потерпи", "успокойся", "всё из-за пмс"];

export function guardViolation(text: string): boolean {
  const lower = text.toLowerCase();
  if (BLOCK_PHRASES.some((p) => lower.includes(p))) return true;
  return BLOCK_WORDS.some((w) => lower.includes(w));
}
