// Перки-титулы партнёра: открываются за GOOD-фидбеки (реальные действия).
// Это статусы с юмором, а не игровая механика: никаких «бонусов» в жизни.

export interface Perk {
  id: string;
  at: number; // сколько GOOD нужно
  title: string;
  desc: string; // ироничное описание «пассивки/активки»
}

export const PERKS: Perk[] = [
  {
    id: "perk_trainee",
    at: 5,
    title: "Стажёр",
    desc: "Принёс еду и не спросил «что случилось?». Уже больше, чем половина мужиков.",
  },
  {
    id: "perk_intheknow",
    at: 10,
    title: "В теме",
    desc: "Понимает, что «я в порядке» — не всегда правда.",
  },
  {
    id: "perk_silence",
    at: 15,
    title: "Хранитель тишины",
    desc: "Знает, когда молчать. И молчит.",
  },
  {
    id: "perk_reader",
    at: 25,
    title: "Читает её",
    desc: "По взгляду отличает «хочу роллы» от «хочу, чтоб не трогали».",
  },
  {
    id: "perk_theone",
    at: 40,
    title: "Тот самый",
    desc: "Она хвастается им подругам. Тебе можно гордиться.",
  },
];

export function getPerk(goodCount: number): Perk | null {
  let current: Perk | null = null;
  for (const p of PERKS) {
    if (goodCount >= p.at) current = p;
  }
  return current;
}

export function nextPerk(goodCount: number): Perk | null {
  return PERKS.find((p) => goodCount < p.at) ?? null;
}
