import { NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

// POST /api/push/remind — партнёр просит напомнить OWNER собрать послание.
// Шлёт пуш Оле (если у неё есть подписки); иначе { sent: 0 } → клиент покажет фолбэк.

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.coupleId) return NextResponse.json({ error: "no couple" }, { status: 409 });

    const couple = await prisma.coupleProfile.findUnique({
      where: { id: user.coupleId },
      include: { members: true },
    });
    const owner = couple?.members.find((m) => m.role === "OWNER");
    if (!owner) return NextResponse.json({ error: "no owner" }, { status: 404 });

    const subs = (owner.pushSubs ?? []) as { endpoint: string; keys: { p256dh: string; auth: string } }[];
    if (subs.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const vapid = {
      subject: process.env.VAPID_SUBJECT ?? "mailto:sync@sync.app",
      publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
      privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    };
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

    const payload = JSON.stringify({
      title: "Он ждёт твоё послание 🍾",
      body: "Партнёр уже в паре. Собери послание — и он узнает, как тебя поддержать.",
      url: "/onboarding",
    });

    let sent = 0;
    const dead: string[] = [];
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub as never, payload);
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) dead.push(sub.endpoint);
      }
    }
    if (dead.length > 0) {
      await prisma.user.update({
        where: { id: owner.id },
        data: { pushSubs: subs.filter((s) => !dead.includes(s.endpoint)) },
      });
    }
    track("remind_owner", { userId: session.user.id });
    return NextResponse.json({ ok: true, sent });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
