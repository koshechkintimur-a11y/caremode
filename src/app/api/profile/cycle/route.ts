import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

// PUT /api/profile/cycle — OWNER передаёт «день цикла» (число, без дат)
// и согласие показывать навигатор партнёру.
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { cycleDay?: number | null; visible?: boolean; dayStates?: Record<string, string>; expectedCycleDay?: number | null; periodEnded?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const cycleDay = body.cycleDay ?? null;
  if (cycleDay !== null && (!Number.isInteger(cycleDay) || cycleDay < 1 || cycleDay > 45)) {
    return NextResponse.json({ error: "invalid cycleDay" }, { status: 400 });
  }

  // ожидаемый день старта (число) — для «штормового предупреждения» партнёру
  const expectedCycleDay = body.expectedCycleDay ?? null;
  if (expectedCycleDay !== null && (!Number.isInteger(expectedCycleDay) || expectedCycleDay < 1 || expectedCycleDay > 45)) {
    return NextResponse.json({ error: "invalid expectedCycleDay" }, { status: 400 });
  }

  // самочувствие по дням: { "1": "red"|"yellow"|"green" }
  let dayStates: Record<string, string> | undefined;
  if (body.dayStates !== undefined) {
    if (typeof body.dayStates !== "object" || body.dayStates === null) {
      return NextResponse.json({ error: "invalid dayStates" }, { status: 400 });
    }
    const valid = ["red", "yellow", "green"];
    for (const [k, v] of Object.entries(body.dayStates)) {
      const n = Number(k);
      if (!Number.isInteger(n) || n < 1 || n > 28 || !valid.includes(v)) {
        return NextResponse.json({ error: "invalid dayStates" }, { status: 400 });
      }
    }
    dayStates = body.dayStates;
  }

  if (body.cycleDay !== undefined) track("period_start", { userId: session.user.id });

  const periodEnded = Boolean(body.periodEnded);
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      cycleDay,
      expectedCycleDay,
      cycleDayVisible: Boolean(body.visible),
      periodEnded,
      ...(dayStates ? { dayStates: dayStates as unknown as object } : {}),
    },
  });

  // «месячные закончились» — сразу говорим партнёру (ТГ + его апка увидит при поллинге)
  if (periodEnded) {
    const owner = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { couple: { include: { members: true } } },
    });
    const partner = owner?.couple?.members.find((m) => m.id !== session.user.id);
    void import("@/lib/tg").then(({ sendTg }) =>
      sendTg(
        partner,
        `🌤 <b>Месячные закончились.</b>\n\nОна снова в строю — и впереди лучшие дни для свидания и комплиментов.`
      )
    );
    track("period_end", { userId: session.user.id });
  }

  return NextResponse.json({ ok: true });
}
