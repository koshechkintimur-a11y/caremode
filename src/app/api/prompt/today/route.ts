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

  const result = await getOrCreateTodayPrompt(user.coupleId);

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
    aiCardsLeft: result.aiCardsLeft,
    subStatus: user.subStatus,
    pausePartner: user.pausePartner,
    promptTime: user.promptTime ?? null,
    cycleDay: owner?.cycleDayVisible ? owner.cycleDay : null,
    cycleVisible: owner?.cycleDayVisible ?? false,
    ownerMood: owner?.mood ?? null,
    ownerNeedsSpace: owner?.needsSpace ?? false,
    cycleDayStates: owner?.cycleDayVisible
      ? ((owner?.dayStates as Record<string, string> | null) ?? {})
      : {},
    cozy: ((owner?.careProfile as Record<string, unknown> | null)?.cozy ?? []) as string[],
  });
}
