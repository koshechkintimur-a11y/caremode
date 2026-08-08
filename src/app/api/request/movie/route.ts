import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { sendTg } from "@/lib/tg";

// POST /api/request/movie — { title } — партнёр предлагает фильм (просьба «Пусть выберет он»)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { members: true } } },
  });
  if (!user?.coupleId || !user.couple || user.couple.requestNeed !== "movie" || user.couple.requestDone) {
    return NextResponse.json({ error: "no movie request" }, { status: 409 });
  }

  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const title = String(body.title ?? "").trim().slice(0, 100);
  if (!title) return NextResponse.json({ error: "empty" }, { status: 400 });

  await prisma.coupleProfile.update({
    where: { id: user.coupleId },
    data: { requestDone: true, requestAnswer: title },
  });
  track("request_movie", { userId: user.id, coupleId: user.coupleId });

  const owner = user.couple.members.find((m) => m.role === "OWNER");
  void sendTg(
    owner,
    `🎬 <b>Он предлагает фильм!</b>\n\n«${title}»\n\nВечер спасён — можно готовить попкорн 🍿`
  );

  return NextResponse.json({ ok: true });
}
