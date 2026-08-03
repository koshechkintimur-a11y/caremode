// Карточки «профиля заботы» для онбординга OWNER.
// id хранятся в careProfile (Json) — меняем набор без миграций.

export interface CareOption {
  id: string;
  label: string;
  icon: string; // имя иконки lucide — маппинг в компоненте
}

export interface CareGroup {
  key: "food" | "space" | "words" | "dont";
  title: string;
  subtitle: string;
  options: CareOption[];
}

export const CARE_GROUPS: CareGroup[] = [
  {
    key: "food",
    title: "Когда совсем нет сил, тебя спасёт…",
    subtitle: "Выбери, что реально помогает. Честно.",
    options: [
      { id: "painkiller", label: "Обезбол", icon: "Pill" },
      { id: "chocolate", label: "Шоколад или что-то сладкое", icon: "Candy" },
      { id: "salty", label: "Что-то солёное", icon: "Salad" },
      { id: "warm", label: "Горячий чай", icon: "Coffee" },
      { id: "delivery", label: "Доставка любимой еды", icon: "Bike" },
      { id: "heater", label: "Тёплая грелка на живот", icon: "Flame" },
    ],
  },
  {
    key: "space",
    title: "Как ему быть рядом?",
    subtitle: "Твоё идеальное пространство в эти дни",
    options: [
      { id: "hug", label: "Обнять и быть рядом", icon: "HeartHandshake" },
      { id: "near", label: "Быть рядом, молча", icon: "Users" },
      { id: "leave", label: "Не трогать", icon: "CircleOff" },
      { id: "distract", label: "Отвлечь фильмом", icon: "Clapperboard" },
      { id: "tasks", label: "Взять дела на себя", icon: "ListChecks" },
    ],
  },
  {
    key: "words",
    title: "Какие слова поддерживают?",
    subtitle: "Что говорить, а что — не стоит",
    options: [
      { id: "here", label: "«Я рядом»", icon: "MessageHeart" },
      { id: "cope", label: "«Ты справишься»", icon: "Sparkles" },
      { id: "right", label: "«Ты права»", icon: "CheckCheck" },
      { id: "compliment", label: "Комплимент", icon: "Heart" },
      { id: "silence", label: "Лучше молчать", icon: "VolumeX" },
    ],
  },
];

// «Не делать» — что бесит в эти дни (секция инструкции)
export const DONT_GROUP: CareGroup = {
  key: "dont",
  title: "Что тебя бесит больше всего?",
  subtitle: "Это попадёт в «Не делать» его инструкции",
  options: [
    { id: "questions", label: "Вопросы «что случилось?»", icon: "MessageCircleQuestion" },
    { id: "advice", label: "Советы и решения", icon: "Lightbulb" },
    { id: "pity", label: "Жалость", icon: "CloudRain" },
    { id: "panic", label: "Паника и суета", icon: "AlertTriangle" },
    { id: "ignore", label: "«Отдохни и пройдёт»", icon: "XCircle" },
  ],
};

// Суперсила — шуточный выбор (WOW-секция инструкции)
export const SUPER_POWERS = [
  { id: "weather", label: "Управлять погодой дома" },
  { id: "finder", label: "Находить то, что он потерял" },
  { id: "memory", label: "Помнить всё. Вообще всё." },
  { id: "foodmind", label: "Заказывать еду силой мысли" },
];

export const MOODS: { id: "TERRIBLE" | "MEH" | "GREAT"; label: string; icon: string }[] = [
  { id: "TERRIBLE", label: "Всё бесит", icon: "CloudRain" },
  { id: "MEH", label: "Так себе", icon: "Cloud" },
  { id: "GREAT", label: "Отлично", icon: "Sunrise" },
];
