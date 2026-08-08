import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/tg/code — создать одноразовый код связки (TTL 10 мин).
// Юзер отправляет код боту → бот зовёт /api/tg/link.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];

  await prisma.user.update({
    where: { id: session.user.id },
    data: { tgCode: code, tgCodeAt: new Date() },
  });

  return NextResponse.json({ code });
}
