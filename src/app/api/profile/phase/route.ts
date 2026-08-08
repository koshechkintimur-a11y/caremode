import { NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { Phase, Mood } from "@/generated/prisma/enums";

// PUT /api/profile/phase — OWNER передаёт ТОЛЬКО фазу + настроение (без дат)
// + needNow: «что ей нужно сейчас» (hug|food|talk|alone|movie) — при смене
// партнёру мгновенно уходит пуш.

const NEED_LABELS: Record<string, string> = {
  hug: "Обнять 🤗",
  food: "Принести еду 🍫",
  talk: "Поговорить 💬",
  alone: "Побыть одной 🚪",
  movie: "Фильм вместе 🎬",
};

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { phase?: string | null; mood?: string | null; needsSpace?: boolean; needNow?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const validPhases = ["MENSTRUAL", "FOLLICULAR", "OVULATION", "LUTEAL", "UNKNOWN", null];
  const validMoods = ["TERRIBLE", "MEH", "OKAY", "GREAT", null];
  const validNeeds = ["hug", "food", "talk", "alone", "movie", null];

  if (!validPhases.includes(body.phase ?? null)) {
    return NextResponse.json({ error: "invalid phase" }, { status: 400 });
  }
  if (!validMoods.includes(body.mood ?? null)) {
    return NextResponse.json({ error: "invalid mood" }, { status: 400 });
  }
  if (!validNeeds.includes(body.needNow ?? null)) {
    return NextResponse.json({ error: "invalid needNow" }, { status: 400 });
  }

  const needNow = body.needNow ?? null;
  // детали просьбы: { text?: string (≤200), photo?: dataURL jpeg ≤ ~400KB }
  let needDetail: { text?: string; photo?: string } | null = null;
  if (needNow && (body as { needDetail?: unknown }).needDetail) {
    const d = (body as { needDetail?: { text?: string; photo?: string } }).needDetail!;
    const text = String(d.text ?? "").trim().slice(0, 200);
    const photo = typeof d.photo === "string" && d.photo.startsWith("data:image/") && d.photo.length < 500_000 ? d.photo : undefined;
    if (text || photo) needDetail = { ...(text ? { text } : {}), ...(photo ? { photo } : {}) };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      phase: (body.phase ?? null) as Phase | null,
      mood: (body.mood ?? null) as Mood | null,
      phaseUpdatedAt: new Date(),
      moodUpdatedAt: new Date(),
      needsSpace: Boolean(body.needsSpace),
      needNow,
      needDetail: needDetail as never,
    },
  });

  if (body.mood) track("mood", { userId: session.user.id });
  if (body.needsSpace) track("needs_space", { userId: session.user.id });
  if (needNow) track("need_now", { userId: session.user.id });

  // Telegram-уведомления партнёру: настроение и «что нужно» — пуш на каждое действие
  {
    const u2 = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { couple: { include: { members: true } } },
    });
    const partner = u2?.couple?.members.find((m) => m.id !== session.user.id);
    if (body.mood) {
      const label =
        ({ TERRIBLE: "Всё бесит", MEH: "Так себе", OKAY: "Нормально", GREAT: "Отлично" } as Record<string, string>)[
          String(body.mood)
        ] ?? String(body.mood);
      void import("@/lib/tg").then(({ sendTg, TG_MSGS }) => sendTg(partner, TG_MSGS.sheMood(label)));
    }
    if (needNow) {
      void import("@/lib/tg").then(({ sendTg, TG_MSGS }) =>
        sendTg(
          partner,
          TG_MSGS.sheNeeds(
            `${NEED_LABELS[needNow] ?? String(needNow)}${needDetail?.text ? ` — ${needDetail.text}` : ""}`
          )
        )
      );
    }
  }

  // Мгновенный пуш партнёру, когда она отметила «что нужно»
  if (needNow) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { couple: { include: { members: true } } },
      });
      const partner = user?.couple?.members.find((m) => m.role === "PARTNER");
      const subs = (partner?.pushSubs ?? []) as { endpoint: string; keys: { p256dh: string; auth: string } }[];
      if (partner && subs.length > 0) {
        const vapid = {
          subject: process.env.VAPID_SUBJECT ?? "mailto:sync@sync.app",
          publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
          privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
        };
        webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
        const payload = JSON.stringify({
          title: "Она подсказывает 💛",
          body: `Ей сейчас нужно: ${NEED_LABELS[needNow]}`,
          url: "/today",
        });
        const dead: string[] = [];
        for (const sub of subs) {
          try {
            await webpush.sendNotification(sub as never, payload);
          } catch (e) {
            const code = (e as { statusCode?: number })?.statusCode;
            if (code === 404 || code === 410) dead.push(sub.endpoint);
          }
        }
        if (dead.length > 0) {
          await prisma.user.update({
            where: { id: partner.id },
            data: { pushSubs: subs.filter((s) => !dead.includes(s.endpoint)) },
          });
        }
      }
    } catch {
      /* пуш не критичен — отметка уже сохранена */
    }
  }

  return NextResponse.json({ ok: true });
}
