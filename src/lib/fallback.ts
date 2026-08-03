// Курируемая библиотека фраз — «голос бренда» и фолбэк при сбое ИИ.
// Правила тона (не нарушать):
//  - ирония только про ситуацию или действия партнёра, НИКОГДА про неё;
//  - никаких «терпи/успокойся/гормоны»;
//  - всегда одно конкретное действие на сегодня;
//  - {food}/{space}/{word} подставляются из её профиля заботы.

export type Phase = "MENSTRUAL" | "FOLLICULAR" | "OVULATION" | "LUTEAL" | "UNKNOWN";
export type Mood = "TERRIBLE" | "MEH" | "OKAY" | "GREAT" | null;

export interface CareProfile {
  food?: string[]; // что из еды помогает
  space?: string[]; // обнять / не трогать / рядом
  words?: string[]; // какие слова поддерживают
  custom?: string; // свободное поле
  cozy?: string[]; // «список уютного»: действия и состояния, не покупки
  dont?: string[]; // «не делать»: что бесит в эти дни
  passwordPhrase?: string; // фраза-пароль: «Я заказал еду, просто лежи»
  superpower?: string; // её суперсила (шуточная)
}

interface Fx {
  (c: CareProfile): string;
}

const pick = <T,>(arr: T[], seed: number): T => arr[seed % arr.length];

// RU — основной набор
const RU: Record<Phase, Record<string, Fx[]>> = {
  MENSTRUAL: {
    default: [
      (c) =>
        `Сегодня ей нужно: ${pick(c.space ?? ["тишина и покой"], 0)}. Твоя задача — ${pick(
          c.space ?? ["просто быть рядом"],
          1
        )}. Слова — потом. Действия — сейчас.`,
      (c) =>
        `Сегодня она — как телефон на 3%: ${pick(c.food ?? ["что-то тёплое"], 0)} решит больше, чем тысяча слов. Принеси и молчи. Ты справишься.`,
      (c) =>
        `План на сегодня: ${pick(c.food ?? ["горячий чай"], 0)}, плед, ${pick(
          c.space ?? ["обнять и не отпускать"],
          1
        )}. Никаких «а что случилось?» — просто делай.`,
      (c) =>
        `Сегодня твоя суперсила — это ${pick(c.space ?? ["тихое присутствие"], 0)}. ${pick(
          c.words ?? ["«Я рядом»"],
          1
        )} — и это всё, что нужно сказать. Проверено.`,
      (c) =>
        `Она не просит тебя чинить мир. Она просит ${pick(
          c.food ?? ["шоколад"],
          0
        )} и чтобы ты не задавал вопросов. Мир починишь завтра.`,
    ],
    TERRIBLE: [
      (c) =>
        `Сегодня всё бесит, и это нормально. Твоя задача: ${pick(
          c.food ?? ["принести еду"],
          0
        )}, ${pick(c.space ?? ["не трогать"], 1)}. Ноль вопросов. Ноль советов. Только действия.`,
      (c) =>
        `Сегодня слова — это минное поле. Поэтому: ${pick(
          c.food ?? ["еда"],
          0
        )}, ${pick(c.space ?? ["тишина"], 1)}. Если очень хочется сказать — скажи «я рядом». Всё.`,
      (c) =>
        `Серьёзный режим: ${pick(c.food ?? ["что-то тёплое"], 0)} в руки, ${pick(
          c.space ?? ["побыть рядом"],
          1
        )}, рот на замке. Ты справишься. Это всего на сегодня.`,
    ],
    MEH: [
      (c) =>
        `День средней паршивости. Лечится так: ${pick(c.food ?? ["что-то вкусное"], 0)} + ${pick(
          c.space ?? ["обнимашки"],
          1
        )}. Без допроса.`,
    ],
    GREAT: [
      (c) =>
        `Сегодня ей неплохо — но не расслабляйся. ${pick(
          c.food ?? ["Что-то вкусное"],
          0
        )} всё равно решит больше, чем ты думаешь.`,
    ],
  },
  FOLLICULAR: {
    default: [
      () =>
        `Сегодня у неё энергия растёт. Лови момент: предложи ${pick(
          ["прогулку", "что-то новое на ужин", "план на выходные"],
          0
        )}. Она скорее всего скажет «да».`,
      (c) =>
        `Хороший день, чтобы спросить: «куда хочешь пойти?» — и реально послушать ответ. ${pick(
          c.words ?? ["«Ты отлично выглядишь»"],
          0
        )} тоже не повредит.`,
      (c) =>
        `Сегодня она на подъёме. Твоя задача — не проспать это и ${pick(
          c.space ?? ["быть частью её планов"],
          0
        )}.`,
    ],
    TERRIBLE: [
      (c) =>
        `Фаза бодрая, настроение — нет. Бывает. Не читай лекций про «ну ты же обычно весёлая». Просто ${pick(
          c.food ?? ["принеси вкусное"],
          0
        )}.`,
    ],
    MEH: [],
    GREAT: [
      (c) =>
        `Она в ударе. Поддержи: ${pick(
          c.words ?? ["«Я в тебя верю»"],
          0
        )} — и предложи что-нибудь сделать вместе. Сегодня самый удачный день для этого.`,
    ],
  },
  OVULATION: {
    default: [
      (c) =>
        `Сегодня она особенно хороша, и это не только твоё мнение. Скажи ей об этом — конкретно: ${pick(
          c.words ?? ["«Ты сегодня сияешь»"],
          0
        )}. Без «но».`,
      () =>
        `День, когда комплименты работают в 10 раз лучше. ${pick(
          ["Про её улыбку", "Про то, как она собирает планы", "Про её идеи"],
          0
        )} — выбирай и говори.`,
      (c) =>
        `Сегодня она ловит на себе взгляды. Твой ход: подойти и ${pick(
          c.space ?? ["обнять её так, чтобы всем стало ясно"],
          0
        )}.`,
    ],
    TERRIBLE: [
      (c) =>
        `Даже в «сияющий» период бывают паршивые дни. Комплимент — один, осторожный, и ${pick(
          c.food ?? ["еда"],
          0
        )}. Без настойчивости.`,
    ],
    MEH: [],
    GREAT: [
      (c) =>
        `Сегодня можно и нужно: ${pick(
          c.space ?? ["свидание", "танцы на кухне", "спонтанная прогулка"],
          0
        )}. Она в форме. Не упусти.`,
    ],
  },
  LUTEAL: {
    default: [
      (c) =>
        `Сегодня всё раздражает чуть сильнее, чем вчера. Твоя задача: ${pick(
          c.food ?? ["вкусное"],
          0
        )} + ${pick(c.space ?? ["терпение и тишина"], 1)}. Это не про тебя. Это просто день такой.`,
      (c) =>
        `Предупреждение: сегодня она может сказать «всё нормально» голосом, который значит «не всё нормально». Не проверяй. Действуй: ${pick(
          c.food ?? ["еда"],
          0
        )}, ${pick(c.space ?? ["рядом"], 1)}.`,
      (c) =>
        `Сегодня лучше соглашаться. На всё. И ${pick(
          c.words ?? ["«Ты права»"],
          0
        )} — это не капитуляция, это стратегия. Плюс ${pick(c.food ?? ["что-то солёное"], 0)}.`,
      (c) =>
        `Она устала больше, чем показывает. ${pick(
          c.space ?? ["Возьми на себя её дела сегодня"],
          0
        )}. И не жди благодарности — она придёт позже.`,
    ],
    TERRIBLE: [
      (c) =>
        `Сегодня она на взводе. План «черепаха»: медленно, тихо, ${pick(
          c.food ?? ["еда"],
          0
        )}, ${pick(c.space ?? ["дистанция"], 1)}. Не геройствуй, не спорь. Переживёте.`,
      (c) =>
        `Самый опасный день цикла для разговоров. Отложи всё важное. Сегодня: ${pick(
          c.food ?? ["шоколад"],
          0
        )} и ${pick(c.space ?? ["молчаливое присутствие"], 1)}. Завтра поговорите.`,
      (c) =>
        `Если она сейчас скажет что-то резкое — это не про тебя. Выдохни. ${pick(
          c.food ?? ["Принеси что-то вкусное"],
          0
        )} и будь рядом. Серьёзно, это работает.`,
    ],
    MEH: [
      (c) =>
        `День «просто нормально». Не читай по губам, просто ${pick(
          c.space ?? ["побудь рядом"],
          0
        )} и ${pick(c.food ?? ["предложи что-нибудь вкусное"], 1)}.`,
    ],
    GREAT: [
      (c) =>
        `Сюрприз: несмотря на фазу, у неё хороший день. Не спрашивай «почему ты весёлая?». Просто радуйся вместе и ${pick(
          c.space ?? ["будь рядом"],
          0
        )}.`,
    ],
  },
  UNKNOWN: {
    default: [
      (c) =>
        `Сегодня без шпаргалки — просто будь внимательным: ${pick(
          c.space ?? ["заметь, что ей нужно"],
          0
        )}, ${pick(c.food ?? ["предложи вкусное"], 1)}. Эмпатия работает без календаря.`,
      (c) =>
        `Никаких данных — только ты и твоя наблюдательность. ${pick(
          c.words ?? ["«Как ты?» — и правда послушать"],
          0
        )}.`,
    ],
    TERRIBLE: [
      (c) =>
        `Ей сегодня плохо, причины не важны. Действуй: ${pick(
          c.food ?? ["еда"],
          0
        )}, ${pick(c.space ?? ["тишина"], 1)}. Вопросы — потом.`,
    ],
    MEH: [],
    GREAT: [],
  },
};

// EN — базовый набор (для архитектуры i18n)
const EN: Record<Phase, Record<string, Fx[]>> = {
  MENSTRUAL: {
    default: [
      (c) =>
        `Today she needs: ${pick(c.space ?? ["quiet and peace"], 0)}. Your job — ${pick(
          c.space ?? ["just be there"],
          1
        )}. Actions now, words later.`,
      (c) =>
        `Today she runs on 3% battery. ${pick(c.food ?? ["Something warm"], 0)} will do more than a thousand words. Bring it, say nothing.`,
    ],
    TERRIBLE: [
      (c) =>
        `Everything is annoying today, and that's okay. Your job: ${pick(
          c.food ?? ["bring food"],
          0
        )}, ${pick(c.space ?? ["no questions"], 1)}. Just actions.`,
    ],
    MEH: [],
    GREAT: [],
  },
  FOLLICULAR: { default: [], TERRIBLE: [], MEH: [], GREAT: [] },
  OVULATION: { default: [], TERRIBLE: [], MEH: [], GREAT: [] },
  LUTEAL: {
    default: [
      (c) =>
        `Heads up: today she may say "I'm fine" in a voice that means "I'm not fine". Don't test it. ${pick(
          c.food ?? ["Bring snacks"],
          0
        )}, ${pick(c.space ?? ["stay close"], 1)}.`,
      (c) =>
        `Today, agree with everything. "You're right" is not surrender — it's strategy. Plus ${pick(
          c.food ?? ["something salty"],
          0
        )}.`,
    ],
    TERRIBLE: [
      (c) =>
        `Toughest day for conversations. Postpone everything important. Today: ${pick(
          c.food ?? ["chocolate"],
          0
        )} and ${pick(c.space ?? ["silent presence"], 1)}. Talk tomorrow.`,
    ],
    MEH: [],
    GREAT: [],
  },
  UNKNOWN: {
    default: [
      (c) =>
        `No cheat sheet today — just be attentive: ${pick(
          c.space ?? ["notice what she needs"],
          0
        )}, ${pick(c.food ?? ["offer something tasty"], 1)}. Empathy doesn't need a calendar.`,
    ],
    TERRIBLE: [],
    MEH: [],
    GREAT: [],
  },
};

const FINAL_RU: Fx[] = [
  (c) =>
    `Коротко: ${pick(c.food ?? ["что-то вкусное"], 0)}, ${pick(
      c.space ?? ["тишина"],
      1
    )}, ${pick(c.words ?? ["«я рядом»"], 2)}. Сегодня этого достаточно. Завтра будет легче.`,
  (c) =>
    `Твоя задача на сегодня — ${pick(c.space ?? ["быть на её стороне"], 0)}. Во всём. Даже если она не права. Особенно если она не права.`,
  (c) =>
    `Сегодня она — главный человек в комнате. Сделай так, чтобы она это почувствовала: ${pick(
      c.words ?? ["скажи ей это"],
      0
    )}.`,
];

const FINAL_EN: Fx[] = [
  (c) =>
    `Short version: ${pick(c.food ?? ["something tasty"], 0)}, ${pick(
      c.space ?? ["quiet"],
      1
    )}, ${pick(c.words ?? ["“I'm here”"], 2)}. That's enough for today.`,
];

export function fallbackPhrase(
  phase: Phase,
  mood: Mood,
  care: CareProfile,
  locale: "ru" | "en" = "ru",
  seed: number = Date.now()
): string {
  const lib = locale === "en" ? EN : RU;
  const moodKey = mood ?? "default";
  const bucket = lib[phase]?.[moodKey];
  const fns = bucket && bucket.length > 0 ? bucket : lib[phase]?.default ?? [];
  const finals = locale === "en" ? FINAL_EN : FINAL_RU;
  const all = [...fns, ...finals];
  return pick(all, seed)(care);
}

// Честный ответ, когда партнёр нажал «не то» — для следующего дня
export function fallbackAfterBad(care: CareProfile, locale: "ru" | "en" = "ru"): string {
  return locale === "en"
    ? `Okay, plan B: ${pick(care.food ?? ["something warm"], 0)} and ${pick(
        care.space ?? ["just being there"],
        1
      )}. No words needed.`
    : `Окей, план Б: ${pick(care.food ?? ["что-то тёплое"], 0)} и ${pick(
        care.space ?? ["просто быть рядом"],
        1
      )}. Слова сегодня не обязательны.`;
}
