import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { sendTg } from "@/lib/tg";

const KINDS = ["date", "anniversary", "appointment"];
const KIND_LABELS: Record<string, string> = { date: "Свидание 💞", anniversary: "Годовщина 🎂", appointment: "Приём 🩺" };

// GET /api/events — события пары (все, сортировка по дате)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.coupleId) return NextResponse.json({ error: "no couple" }, { status: 409 });

  const events = await prisma.coupleEvent.findMany({
    where: { coupleId: user.coupleId },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      date: e.date,
      title: e.title,
      kind: e.kind,
      confirmed: e.confirmed,
      createdByMe: e.createdById === session.user.id,
      label: KIND_LABELS[e.kind] ?? e.kind,
    })),
  });
}

// POST /api/events — { date, title, kind } — добавить событие; партнёр узнаёт сразу
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { members: true } } },
  });
  if (!user?.coupleId || !user.couple) return NextResponse.json({ error: "no couple" }, { status: 409 });

  let body: { date?: string; title?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const date = String(body.date ?? "");
  const title = String(body.title ?? "").trim().slice(0, 60);
  const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : "date";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const ev = await prisma.coupleEvent.create({
    data: { coupleId: user.coupleId, date, title, kind, createdById: user.id },
  });
  track("event_add", { userId: user.id, coupleId: user.coupleId });

  const partner = user.couple.members.find((m) => m.id !== user.id);
  const d = date.slice(8) + "." + date.slice(5, 7);
  void sendTg(
    partner,
    `${user.role === "OWNER" ? "Она" : "Он"} добавил(а) событие 📅\n\n<b>${title}</b>\n${d} · ${KIND_LABELS[kind]}\n\nОткрой приложение, чтобы подтвердить ✓`
  );

  return NextResponse.json({ ok: true, id: ev.id });
}

// DELETE /api/events — { id } — удалить СВОЁ событие
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const ev = await prisma.coupleEvent.findUnique({ where: { id: body.id } });
  if (!ev || ev.createdById !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await prisma.coupleEvent.delete({ where: { id: ev.id } });
  return NextResponse.json({ ok: true });
}
