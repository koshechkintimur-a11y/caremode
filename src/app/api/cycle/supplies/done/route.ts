import { NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

// POST /api/cycle/supplies/done — партнёр отметил «Сделаю ✓»:
// карточка у него гаснет, Оле уходит пуш «он уже в магазине 💛».
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { members: true } } },
  });
  if (!user?.coupleId || !user.couple) return NextResponse.json({ error: "no couple" }, { status: 409 });

  await prisma.coupleProfile.update({
    where: { id: user.coupleId },
    data: { suppliesDone: true },
  });
  track("supplies_done", { userId: user.id, coupleId: user.coupleId });

  const owner = user.couple.members.find((m) => m.role === "OWNER");
  const subs = (owner?.pushSubs ?? []) as { endpoint: string; keys: { p256dh: string; auth: string } }[];
  let sent = 0;
  if (owner && subs.length > 0 && !owner.pausePartner) {
    const payload = JSON.stringify({
      title: "Он уже в магазине 💛",
      body: "Ты попросила — он поехал за прокладками. Бережно и на опережение.",
      url: "/today",
    });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload,
          {
            vapidDetails: {
              publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
              privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
              subject: process.env.VAPID_SUBJECT ?? "mailto:caremode@example.com",
            },
          }
        );
        sent++;
      } catch {
        // протухшая подписка — пропускаем
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
