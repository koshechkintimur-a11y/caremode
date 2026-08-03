import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// POST /api/push/subscribe — сохранить подписку браузера
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { endpoint?: string; p256dh?: string; auth?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.endpoint || !body.p256dh || !body.auth) {
    return NextResponse.json({ error: "incomplete subscription" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const subs = ((user.pushSubs as PushSub[] | null) ?? []).filter((s) => s.endpoint !== body.endpoint);
  subs.push({ endpoint: body.endpoint, keys: { p256dh: body.p256dh, auth: body.auth } });

  await prisma.user.update({
    where: { id: user.id },
    data: { pushSubs: subs as unknown as object },
  });
  return NextResponse.json({ ok: true, count: subs.length });
}

// DELETE /api/push/subscribe — отписка
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.endpoint) return NextResponse.json({ error: "no endpoint" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const subs = ((user.pushSubs as PushSub[] | null) ?? []).filter((s) => s.endpoint !== body.endpoint);
  await prisma.user.update({
    where: { id: user.id },
    data: { pushSubs: subs as unknown as object },
  });
  return NextResponse.json({ ok: true });
}
