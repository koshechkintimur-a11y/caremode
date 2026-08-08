import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodayPrompt } from "@/lib/prompt";

// GET /api/prompt/today — карточка дня (генерация при первом запросе за день)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.coupleId) return NextResponse.json({ error: "no couple" }, { status: 409 });

  // активность: не чаще раза в 5 минут (поллинг /today идёт каждые ~30с)
  if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > 5 * 60_000) {
    void prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }

  const result = await getOrCreateTodayPrompt(user.coupleId);

  // Петля «Сделал»: когда Оля открывает приложение, её GOOD-действия (3 дня)
  // помечаются seenAt — парень увидит статус «Она видела 💛»
  if (user.role === "OWNER") {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
    await prisma.dailyPrompt.updateMany({
      where: {
        coupleId: user.coupleId,
        feedback: "GOOD",
        seenAt: null,
        createdAt: { gte: threeDaysAgo },
      },
      data: { seenAt: new Date() },
    });
  }

  // Навигатор цикла живёт на OWNER: партнёр видит его только с её согласия
  const couple = await prisma.coupleProfile.findUnique({
    where: { id: user.coupleId },
    include: { members: true },
  });
  const owner = couple?.members.find((m) => m.role === "OWNER");

  return NextResponse.json({
    ...result,
    locale: couple?.locale ?? "ru",
    role: user.role,
    subStatus: user.subStatus,
    pausePartner: user.pausePartner,
    promptTime: user.promptTime ?? null,
    pushEnabled: user.pushEnabled ?? false,
    pushPromptTime: user.pushPromptTime ?? null,
    cycleDay: owner?.cycleDayVisible ? owner.cycleDay : null,
    cycleVisible: owner?.cycleDayVisible ?? false,
    ownerMood: owner?.mood ?? null,
    ownerNeedsSpace: owner?.needsSpace ?? false,
    ownerNeed: owner?.needNow ?? null,
    ownerNeedDetail: ((owner?.needDetail as { text?: string; photo?: string } | null) ?? null),
    suppliesDetail: ((couple?.suppliesDetail as { text?: string; photo?: string } | null) ?? null),
    cycleDayStates: owner?.cycleDayVisible
      ? ((owner?.dayStates as Record<string, string> | null) ?? {})
      : {},
    cozy: ((owner?.careProfile as Record<string, unknown> | null)?.cozy ?? []) as string[],
    firstName: user.firstName,
    supplies: couple?.suppliesAt
      ? { at: couple.suppliesAt.toISOString(), done: couple.suppliesDone }
      : null,
    partnerFirstName:
      couple?.members.find((m) => m.id !== user.id)?.firstName ?? null,
    request: couple?.requestNeed
      ? {
          need: couple.requestNeed,
          detail: (couple.requestDetail as { text?: string; photo?: string } | null) ?? null,
          done: couple.requestDone,
          thanked: couple.requestThanked,
          answer: couple.requestAnswer ?? null,
        }
      : null,
  });
}
