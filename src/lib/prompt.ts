import "server-only";
import { prisma } from "@/lib/prisma";
import { CARE_GROUPS } from "@/lib/careOptions";
import { generatePrompt } from "@/lib/ai/generator";
import { buildPartnerContext, type PartnerProfile } from "@/lib/partnerContext";
import {
  fallbackPhrase,
  fallbackAfterBad,
  type CareProfile,
  type Phase,
  type Mood,
} from "@/lib/fallback";
import { todayKey, shiftDay } from "@/lib/utils";

// Фри-модель: приложение бесплатно, но ИИ-генерации лимитированы.
// Курируемая библиотека фраз — бесплатный базовый уровень ВСЕГДА.
export const AI_LIMIT_PER_DAY = 2; // ИИ-карточек в день на пару

// id карточек → человекочитаемые label'ы («borsh» → «Борщ или суп»)
const LABEL_BY_ID = new Map<string, string>();
for (const g of CARE_GROUPS) {
  for (const o of g.options) LABEL_BY_ID.set(o.id, o.label);
}
function resolveCare(raw: CareProfile): CareProfile {
  const map = (ids?: string[]) => (ids ?? []).map((id) => LABEL_BY_ID.get(id) ?? id);
  return {
    food: map(raw.food),
    space: map(raw.space),
    words: map(raw.words),
    custom: raw.custom,
  };
}

export interface TodayResult {
  prompt: {
    id: string;
    day: string;
    text: string;
    feedback: string | null;
    source: string;
    seenAt: string | null;
    thankedAt: string | null;
  } | null;
  emptyOwner?: boolean;
  paused: boolean;
  paywall: boolean; // всегда false сейчас — задел на будущую подписку
  streak: number;
  aiCardsLeft: number;
}

/** Карточка дня: кэш в DailyPrompt, одна генерация на пару в день. */
export async function getOrCreateTodayPrompt(coupleId: string): Promise<TodayResult> {
  const couple = await prisma.coupleProfile.findUnique({
    where: { id: coupleId },
    include: { members: true, prompts: { orderBy: { day: "desc" }, take: 7 } },
  });
  if (!couple) throw new Error("couple not found");

  const owner = couple.members.find((m) => m.role === "OWNER");
  const partner = couple.members.find((m) => m.role === "PARTNER");
  if (!owner || !partner) throw new Error("couple incomplete");

  const streak = await calcStreak(coupleId);

  // Режим инкогнито: партнёр видит только нейтральное «пауза»
  if (owner.pausePartner) {
    return { prompt: null, paused: true, paywall: false, streak, aiCardsLeft: 0 };
  }

  // Оля ещё НИЧЕГО не настроила (нет послания и ни одной отметки) —
  // карточку не генерируем: «пустышка» ломает восприятие («откуда подсказка?»).
  const cpRaw = (owner.careProfile ?? {}) as Record<string, unknown>;
  const cpEmpty =
    !cpRaw ||
    ((!Array.isArray(cpRaw.food) || cpRaw.food.length === 0) &&
      (!Array.isArray(cpRaw.space) || cpRaw.space.length === 0) &&
      (!Array.isArray(cpRaw.words) || cpRaw.words.length === 0) &&
      !cpRaw.custom);
  const ownerEmpty =
    cpEmpty && !owner.mood && !owner.cycleDay && !owner.needsSpace && !owner.phase;
  if (ownerEmpty) {
    return { prompt: null, emptyOwner: true, paused: false, paywall: false, streak, aiCardsLeft: 0 };
  }

  const day = todayKey();

  // Сколько ИИ-карточек уже сгенерировано сегодня (для лимита и счётчика)
  const aiToday = await prisma.dailyPrompt.count({
    where: { coupleId, day, source: "AI" },
  });
  const aiCardsLeft = Math.max(0, AI_LIMIT_PER_DAY - aiToday);
  const paid =
    partner.subStatus === "ACTIVE" && (partner.subExpiresAt ?? new Date(0)) > new Date();

  const existing = couple.prompts.find((p) => p.day === day);

  // ПУЛЬС: она обновила настроение после генерации карточки, а он ещё не ответил —
  // перегенерируем под новое настроение (с учётом ИИ-лимита).
  const moodChanged =
    existing &&
    !existing.feedback &&
    owner.mood &&
    owner.moodUpdatedAt &&
    existing.moodContext !== owner.mood &&
    new Date(owner.moodUpdatedAt).getTime() > existing.createdAt.getTime();

  if (existing && !moodChanged && existing.feedback !== "BAD") {
    return {
      prompt: { id: existing.id, day: existing.day, text: existing.text, feedback: existing.feedback, source: existing.source, seenAt: existing.seenAt ? existing.seenAt.toISOString() : null, thankedAt: existing.thankedAt ? existing.thankedAt.toISOString() : null },
      paused: false,
      paywall: false,
      streak,
      aiCardsLeft,
    };
  }

  const care = resolveCare((owner.careProfile ?? {}) as CareProfile);
  const phase = (owner.phase ?? "UNKNOWN") as Phase;
  const mood = (owner.mood ?? null) as Mood;
  const locale: "ru" | "en" = couple.locale === "en" ? "en" : "ru";
  const partnerCtx = buildPartnerContext(
    (partner.partnerProfile ?? null) as PartnerProfile | null
  );

  const lastBad = couple.prompts.find((p) => p.feedback === "BAD");
  if (lastBad && shiftDay(lastBad.day, 0) === day && !existing) {
    const created = await prisma.dailyPrompt.create({
      data: { coupleId, day, text: fallbackAfterBad(care, locale), source: "FALLBACK", moodContext: mood ?? null },
    });
    return {
      prompt: { id: created.id, day, text: created.text, feedback: created.feedback, source: created.source, seenAt: null, thankedAt: null },
      paused: false,
      paywall: false,
      streak,
      aiCardsLeft,
    };
  }

  // ИИ-генерация, если лимит не исчерпан (или есть подписка);
  // иначе — курируемая библиотека (бесплатный базовый уровень).
  let text: string;
  let source: "AI" | "FALLBACK";
  if (paid || aiCardsLeft > 0) {
    const r = await generatePrompt({
      phase,
      mood,
      careProfile: care,
      locale,
      partnerContext: partnerCtx,
      dayTogether: Math.max(
        1,
        Math.floor((Date.now() - new Date(couple.startDate).getTime()) / 86_400_000)
      ),
      recentFeedback: couple.prompts
        .filter((p) => p.feedback)
        .map((p) => ({ feedback: p.feedback as string, text: p.text })),
      needNow: owner?.needNow ?? null,
    });
    text = r.text;
    source = r.source;
  } else {
    text = fallbackPhrase(phase, mood, care, locale, Date.now());
    source = "FALLBACK";
  }

  const created = existing
    ? await prisma.dailyPrompt.update({
        where: { id: existing.id },
        data: { text, source, moodContext: mood ?? null },
      })
    : await prisma.dailyPrompt.create({
        data: { coupleId, day, text, source, moodContext: mood ?? null },
      });

  return {
    prompt: { id: created.id, day, text: created.text, feedback: created.feedback, source: created.source, seenAt: null, thankedAt: null },
    paused: false,
    paywall: false,
    streak,
    aiCardsLeft: Math.max(0, aiCardsLeft - (source === "AI" ? 1 : 0)),
  };
}

/** Стреак: подряд идущие дни с ответом (сегодня или со вчера). */
export async function calcStreak(coupleId: string): Promise<number> {
  const rows = await prisma.dailyPrompt.findMany({
    where: { coupleId, feedback: { not: null } },
    orderBy: { day: "desc" },
    select: { day: true },
  });
  const days = new Set(rows.map((r) => r.day));
  let cursor = todayKey();
  if (!days.has(cursor)) cursor = shiftDay(cursor, -1); // сегодня ещё не ответил — считаем со вчера
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/** Фидбек + разблокировка ачивок. */
export async function applyFeedback(promptId: string, feedback: "GOOD" | "MISSED" | "BAD", userId: string) {
  const prompt = await prisma.dailyPrompt.findUnique({ where: { id: promptId } });
  if (!prompt) throw new Error("prompt not found");

  await prisma.dailyPrompt.update({
    where: { id: promptId },
    data: { feedback },
  });

  const streak = await calcStreak(prompt.coupleId);
  const unlocked = await unlockAchievements(userId, prompt.coupleId, streak);
  return { streak, unlocked };
}

async function unlockAchievements(userId: string, coupleId: string, streak: number): Promise<string[]> {
  const existing = await prisma.achievement.findMany({ where: { userId } });
  const types = new Set(existing.map((a) => a.type));
  const todo: { userId: string; type: string }[] = [];

  if (streak >= 7 && !types.has("ninja_7d")) todo.push({ userId, type: "ninja_7d" });

  const goodCount = await prisma.dailyPrompt.count({ where: { coupleId, feedback: "GOOD" } });
  if (goodCount >= 10 && !types.has("gentleman_10")) todo.push({ userId, type: "gentleman_10" });

  if (todo.length > 0) {
    await prisma.achievement.createMany({ data: todo });
  }
  return todo.map((t) => t.type);
}

export const ACHIEVEMENT_LABEL: Record<string, string> = {
  ninja_7d: "Ниндзя эмпатии — 7 дней подряд",
  gentleman_10: "Джентльмен — 10 засчитанных дней",
  first_cycle_together: "Первый цикл вместе",
};
