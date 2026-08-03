import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENT_LABEL } from "@/lib/prompt";
import { getPerk, nextPerk } from "@/lib/perks";

// GET /api/achievements — ачивки + перки-титулы партнёра
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { members: true } } },
  });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const coupleId = user.coupleId;
  const partner = coupleId
    ? user.couple?.members.find((m) => m.role === "PARTNER")
    : null;

  const [achievements, goodCount] = await Promise.all([
    prisma.achievement.findMany({
      where: { userId: user.id },
      orderBy: { unlockedAt: "desc" },
    }),
    coupleId
      ? prisma.dailyPrompt.count({ where: { coupleId, feedback: "GOOD" } })
      : Promise.resolve(0),
  ]);

  const reward = achievements.find((a) => a.type === "cycle_reward");
  let rewardText: string | null = null;
  if (reward?.meta) {
    try {
      rewardText = JSON.parse(reward.meta).text ?? null;
    } catch {}
  }

  return NextResponse.json({
    achievements: achievements
      .filter((a) => a.type !== "cycle_reward")
      .map((a) => ({ type: a.type, label: ACHIEVEMENT_LABEL[a.type] ?? a.type })),
    totalGood: goodCount,
    perk: partner ? getPerk(goodCount) : null,
    nextPerk: partner ? nextPerk(goodCount) : null,
    rewardText,
  });
}
