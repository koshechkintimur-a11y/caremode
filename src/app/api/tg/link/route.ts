import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/tg/link — вызывается ТГ-ботом (long polling, с localhost):
// { code, chatId, username } → связываем аккаунт с Telegram.
export async function POST(req: Request) {
  let body: { code?: string; chatId?: string; username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const code = String(body.code ?? "").trim().toUpperCase();
  const chatId = String(body.chatId ?? "").trim();
  if (!code || !chatId) return NextResponse.json({ error: "empty" }, { status: 400 });

  const user = await prisma.user.findFirst({ where: { tgCode: code } });
  if (!user?.tgCodeAt || Date.now() - user.tgCodeAt.getTime() > 10 * 60_000) {
    return NextResponse.json({ error: "expired" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      tgChatId: chatId,
      tgCode: null,
      tgCodeAt: null,
    },
  });

  return NextResponse.json({ ok: true, firstName: user.firstName });
}
