import { NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { sendTg, TG_MSGS } from "@/lib/tg";

// POST /api/cycle/supplies — Оля: «закончились прокладки» → мгновенный пуш партнёру
// (он успевает среагировать на опережение — заехать в магазин до вечера).
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { members: true } } },
  });
  if (!user?.coupleId || !user.couple) return NextResponse.json({ error: "no couple" }, { status: 409 });

  const partner = user.couple.members.find((m) => m.role === "PARTNER");
  track("supplies", { userId: user.id, coupleId: user.coupleId });

  // фиксируем запрос — партнёр увидит карточку в приложении даже без пушей
  await prisma.coupleProfile.update({
    where: { id: user.coupleId },
    data: { suppliesAt: new Date(), suppliesDone: false },
  });
  void sendTg(partner, TG_MSGS.supplies);

  const subs = (partner?.pushSubs ?? []) as { endpoint: string; keys: { p256dh: string; auth: string } }[];
  let sent = 0;
  if (partner && subs.length > 0 && !partner.pausePartner) {
    const payload = JSON.stringify({
      title: "Она просит о помощи 🩸",
      body: "Закончились прокладки — заехать в магазин? Она будет рада.",
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
