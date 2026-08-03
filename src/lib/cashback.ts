import "server-only";
import { prisma } from "@/lib/prisma";

// Кэшбэк Заботы: партнёр набрал достаточно GOOD за цикл →
// OWNER получает право выдать ему награду (сертификат).
// Это баланс: его усилия не «обслуживание», а партнёрство.

export const REWARD_THRESHOLD = 15; // GOOD за последние 28 дней
const CYCLE_WINDOW_MS = 28 * 86_400_000;

export const REWARD_TEMPLATES = [
  "Освобождение от посуды на вечер",
  "Вечер видеоигр без упрёков",
  "Массаж спины от меня",
  "Прощение одного косяка",
  "Право выбрать, что смотрим",
  "Один «я же говорил» без последствий",
];

export interface CashbackState {
  goodCount: number;
  threshold: number;
  canReward: boolean; // OWNER: порог пройден и награда ещё не выдана
  reward: { text: string; date: string } | null; // последняя выданная награда
}

export async function getCashbackState(coupleId: string): Promise<CashbackState> {
  const couple = await prisma.coupleProfile.findUnique({
    where: { id: coupleId },
    include: { members: true },
  });
  if (!couple) throw new Error("couple not found");

  const owner = couple.members.find((m) => m.role === "OWNER");
  const partner = couple.members.find((m) => m.role === "PARTNER");
  if (!owner || !partner) throw new Error("couple incomplete");

  const since = new Date(Date.now() - CYCLE_WINDOW_MS);
  const [goodCount, rewards] = await Promise.all([
    prisma.dailyPrompt.count({
      where: { coupleId, feedback: "GOOD", createdAt: { gte: since } },
    }),
    prisma.achievement.findMany({
      where: { userId: partner.id, type: "cycle_reward" },
      orderBy: { unlockedAt: "desc" },
      take: 1,
    }),
  ]);

  const lastReward = rewards[0] ?? null;
  const recentReward =
    lastReward && lastReward.unlockedAt.getTime() > since.getTime();

  let reward: CashbackState["reward"] = null;
  if (lastReward) {
    try {
      const meta = JSON.parse(lastReward.meta ?? "{}");
      reward = {
        text: String(meta.text ?? ""),
        date: lastReward.unlockedAt.toISOString().slice(0, 10),
      };
    } catch {
      reward = null;
    }
  }

  return {
    goodCount,
    threshold: REWARD_THRESHOLD,
    canReward: goodCount >= REWARD_THRESHOLD && !recentReward,
    reward,
  };
}

/** OWNER выдаёт награду → сертификат партнёру. */
export async function giveReward(coupleId: string, text: string) {
  const couple = await prisma.coupleProfile.findUnique({
    where: { id: coupleId },
    include: { members: true },
  });
  const partner = couple?.members.find((m) => m.role === "PARTNER");
  if (!couple || !partner) throw new Error("couple incomplete");
  if (text.trim().length < 2 || text.trim().length > 120) throw new Error("bad text");

  const state = await getCashbackState(coupleId);
  if (!state.canReward) throw new Error("no reward available");

  await prisma.achievement.create({
    data: {
      userId: partner.id,
      type: "cycle_reward",
      meta: JSON.stringify({ text: text.trim() }),
    },
  });
}
