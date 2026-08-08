import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { sendTg } from "@/lib/tg";

// PUT /api/events/confirm — { id } — партнёр подтвердил: создатель узнаёт сразу
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { members: true } } },
  });
  if (!user?.coupleId || !user.couple) return NextResponse.json({ error: "no couple" }, { status: 409 });

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const ev = await prisma.coupleEvent.findUnique({ where: { id: body.id } });
  if (!ev || ev.coupleId !== user.coupleId || ev.createdById === user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (ev.confirmed) return NextResponse.json({ ok: true });

  await prisma.coupleEvent.update({ where: { id: ev.id }, data: { confirmed: true } });
  track("event_confirm", { userId: user.id, coupleId: user.coupleId });

  const creator = user.couple.members.find((m) => m.id === ev.createdById);
  const d = ev.date.slice(8) + "." + ev.date.slice(5, 7);
  void sendTg(creator, `✅ ${user.role === "OWNER" ? "Она" : "Он"} подтвердил(а): <b>${ev.title}</b> (${d})\n\nВы оба в курсе — можно планировать.`);

  return NextResponse.json({ ok: true });
}
