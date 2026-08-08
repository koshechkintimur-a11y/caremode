import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tg/status — { connected: bool, bot: username } для блока в настройках
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tgChatId: true },
  });

  return NextResponse.json({
    connected: Boolean(user?.tgChatId),
    bot: process.env.BOT_USERNAME ?? null,
  });
}

// DELETE /api/tg/status — отключить свои Telegram-уведомления
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { tgChatId: null },
  });

  return NextResponse.json({ ok: true });
}
