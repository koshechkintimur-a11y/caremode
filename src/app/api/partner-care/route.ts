import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcStreak } from "@/lib/prompt";
import { getPerk, nextPerk } from "@/lib/perks";

// GET /api/partner-care — для OWNER: как партнёр заботится о ней
// (перк-уровень, streak, последние поступки). Только агрегаты — без дат цикла.
const WINDOW_MS = 28 * 86_400_000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.coupleId) return NextResponse.json({ error: "no couple" }, { status: 409 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const since = new Date(Date.now() - WINDOW_MS);
  const [goodCount, recent, streak] = await Promise.all([
    prisma.dailyPrompt.count({
      where: { coupleId: user.coupleId, feedback: "GOOD", createdAt: { gte: since } },
    }),
    prisma.dailyPrompt.findMany({
      where: { coupleId: user.coupleId, feedback: "GOOD" },
      orderBy: { day: "desc" },
      take: 7,
      select: { id: true, text: true, day: true, seenAt: true, thankedAt: true },
    }),
    calcStreak(user.coupleId),
  ]);

  const perk = getPerk(goodCount);
  const next = nextPerk(goodCount);

  return NextResponse.json({
    goodCount,
    streak,
    perkTitle: perk?.title ?? "детёныш",
    nextPerkTitle: next?.title ?? null,
    nextPerkAt: next?.at ?? null,
    recent: recent.map((r) => ({
      id: r.id,
      text: r.text,
      day: r.day.slice(5).split("-").reverse().join("."),
      thanked: Boolean(r.thankedAt),
      seen: Boolean(r.seenAt),
    })),
  });
}
