import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

// POST /api/pair — OWNER создаёт пару → инвайт-код
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "only owner creates pair" }, { status: 403 });
  if (user.coupleId) return NextResponse.json({ error: "already in pair" }, { status: 409 });

  const inviteCode = genCode();
  const couple = await prisma.coupleProfile.create({
    data: { inviteCode, ownerId: user.id },
  });
  await prisma.user.update({ where: { id: user.id }, data: { coupleId: couple.id } });
  track("pair_created", { userId: user.id, coupleId: couple.id });

  return NextResponse.json({ inviteCode: couple.inviteCode });
}

// GET /api/pair — статус пары (для экрана приглашения)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.coupleId) return NextResponse.json({ error: "no couple" }, { status: 409 });

  const couple = await prisma.coupleProfile.findUnique({ where: { id: user.coupleId } });
  if (!couple) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    inviteCode: couple.inviteCode,
    partnerJoined: Boolean(couple.partnerId),
    locale: couple.locale,
  });
}

function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
