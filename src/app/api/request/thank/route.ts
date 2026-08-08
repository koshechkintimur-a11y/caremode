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

// POST /api/request/thank — она поблагодарила 💛 по выполненной просьбе
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { members: true } } },
  });
  if (!user?.coupleId || !user.couple || !user.couple.requestNeed || !user.couple.requestDone) {
    return NextResponse.json({ error: "nothing to thank" }, { status: 409 });
  }
  if (user.couple.requestThanked) return NextResponse.json({ ok: true });

  await prisma.coupleProfile.update({
    where: { id: user.coupleId },
    data: { requestThanked: true },
  });
  track("request_thank", { userId: user.id, coupleId: user.coupleId });

  const partner = user.couple.members.find((m) => m.id !== user.id);
  const need = NEED_LABELS[user.couple.requestNeed] ?? user.couple.requestNeed;
  const isAlone = user.couple.requestNeed === "alone";
  void sendTg(
    partner,
    isAlone
      ? `✨ <b>Она поблагодарила!</b>\n\n«Спасибо, что понял» — ты уважаешь её пространство, и она это ценит 💛`
      : `✨ <b>Она поблагодарила!</b>\n\n«${need}» — ты сделал это, и она это оценила 💛\n\nТы — тот самый.`
  );

  return NextResponse.json({ ok: true });
}
