import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { track } from "@/lib/analytics";

// POST /api/cycle/supplies/reset — Оля закрыла статус: снова можно попросить
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.coupleId) return NextResponse.json({ error: "no couple" }, { status: 409 });

  await prisma.coupleProfile.update({
    where: { id: user.coupleId },
    data: { suppliesAt: null, suppliesDone: false, suppliesDetail: Prisma.JsonNull },
  });
  track("supplies_reset", { userId: user.id, coupleId: user.coupleId });

  return NextResponse.json({ ok: true });
}
