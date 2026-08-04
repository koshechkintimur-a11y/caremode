import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

// POST /api/pair/join — PARTNER входит в пару по коду
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { inviteCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const code = String(body.inviteCode ?? "").trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) {
    return NextResponse.json({ error: "Непохоже на код. Попробуй ещё раз." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (user.coupleId) return NextResponse.json({ error: "Ты уже в паре" }, { status: 409 });

  const couple = await prisma.coupleProfile.findUnique({ where: { inviteCode: code } });
  if (!couple) return NextResponse.json({ error: "Код не найден. Проверь и попробуй снова." }, { status: 404 });
  if (couple.partnerId) return NextResponse.json({ error: "У этой пары уже есть партнёр" }, { status: 409 });
  if (couple.ownerId === user.id) return NextResponse.json({ error: "Это твоя пара" }, { status: 409 });

  await prisma.$transaction([
    prisma.coupleProfile.update({
      where: { id: couple.id },
      data: { partnerId: user.id },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { coupleId: couple.id, role: "PARTNER" },
    }),
  ]);
  track("partner_joined", { userId: user.id, coupleId: couple.id });

  return NextResponse.json({ ok: true });
}
