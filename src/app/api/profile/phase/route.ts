import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Phase, Mood } from "@/generated/prisma/enums";

// PUT /api/profile/phase — OWNER передаёт ТОЛЬКО фазу + настроение (без дат)
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { phase?: string | null; mood?: string | null; needsSpace?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const validPhases = ["MENSTRUAL", "FOLLICULAR", "OVULATION", "LUTEAL", "UNKNOWN", null];
  const validMoods = ["TERRIBLE", "MEH", "OKAY", "GREAT", null];

  if (!validPhases.includes(body.phase ?? null)) {
    return NextResponse.json({ error: "invalid phase" }, { status: 400 });
  }
  if (!validMoods.includes(body.mood ?? null)) {
    return NextResponse.json({ error: "invalid mood" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      phase: (body.phase ?? null) as Phase | null,
      mood: (body.mood ?? null) as Mood | null,
      phaseUpdatedAt: new Date(),
      moodUpdatedAt: new Date(),
      needsSpace: Boolean(body.needsSpace),
    },
  });

  return NextResponse.json({ ok: true });
}
