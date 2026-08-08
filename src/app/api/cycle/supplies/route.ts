import { NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { sendTg, TG_MSGS } from "@/lib/tg";

// POST /api/cycle/supplies — Оля: «закончились прокладки» (+ какие именно) → пуш партнёру
// (он успевает среагировать на опережение — заехать в магазин до вечера).
export async function POST(req: Request) {
  let detail: { text?: string; photo?: string } | null = null;
  try {
    const body = (await req.json()) as { detail?: { text?: string; photo?: string } };
    if (body.detail) {
      const text = String(body.detail.text ?? "").trim().slice(0, 200);
      const photo = typeof body.detail.photo === "string" && body.detail.photo.startsWith("data:image/") && body.detail.photo.length < 500_000 ? body.detail.photo : undefined;
      if (text || photo) detail = { ...(text ? { text } : {}), ...(photo ? { photo } : {}) };
    }
  } catch {}
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
    data: { suppliesAt: new Date(), suppliesDone: false, suppliesDetail: detail as never },
  });
  void sendTg(
    partner,
    `${TG_MSGS.supplies}${detail?.text ? `\n\n<b>Какие нужны:</b> ${detail.text}` : ""}`,
    detail?.photo
  );

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
