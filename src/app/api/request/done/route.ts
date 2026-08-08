import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { sendTg } from "@/lib/tg";

const NEED_LABELS: Record<string, string> = {
  hug: "Обнять 🤗",
  food: "Принести еду 🍫",
  talk: "Поговорить 💬",
  alone: "Побыть одной 🚪",
  movie: "Фильм вместе 🎬",
};

// POST /api/request/done — партнёр «Сделаю ✓» по активной просьбе; Оля узнаёт сразу
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { members: true } } },
  });
  if (!user?.coupleId || !user.couple || !user.couple.requestNeed) {
    return NextResponse.json({ error: "no active request" }, { status: 409 });
  }
  if (user.couple.requestDone) return NextResponse.json({ ok: true });

  await prisma.coupleProfile.update({
    where: { id: user.coupleId },
    data: { requestDone: true },
  });
  track("request_done", { userId: user.id, coupleId: user.coupleId });

  const owner = user.couple.members.find((m) => m.role === "OWNER");
  const detail = (user.couple.requestDetail as { text?: string } | null)?.text;
  const need = NEED_LABELS[user.couple.requestNeed] ?? user.couple.requestNeed;
  void sendTg(
    owner,
    `💛 <b>Он взял это на себя!</b>\n\n${need}${detail ? ` — ${detail}` : ""}\n\nМожно не напоминать — он уже в деле.`
  );

  return NextResponse.json({ ok: true });
}
