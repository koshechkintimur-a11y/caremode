import "server-only";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { CARE_GROUPS } from "@/lib/careOptions";

// GET /api/push/tick — внутренний «тик» (вызывается cron'ом каждый час):
// рассылает карточку дня партнёрам по их promptTime, если ещё не слали сегодня.

const HOUR_BY_TIME: Record<string, number> = { morning: 9, wake: 10, evening: 20 };

interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "vapid not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:sync@sync.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const hour = new Date().getHours();
  const today = todayKey();

  const couples = await prisma.coupleProfile.findMany({ include: { members: true } });
  let sent = 0;

  for (const couple of couples) {
    const partner = couple.members.find((m) => m.role === "PARTNER");
    const owner = couple.members.find((m) => m.role === "OWNER");
    if (!partner || !owner) continue;

    const subs = (partner.pushSubs as PushSub[] | null) ?? [];
    if (subs.length === 0) continue;

    const targetHour = HOUR_BY_TIME[partner.promptTime ?? ""];
    if (targetHour === undefined || hour !== targetHour) continue;

    // ==== Штормовое предупреждение: за 2 дня до ожидаемого старта ====
    // (приходит утром ВМЕСТО карточки дня — важнее, антидубль на день)
    if (
      owner.expectedCycleDay &&
      owner.cycleDay !== null &&
      owner.cycleDay === owner.expectedCycleDay - 2 &&
      partner.lastStormDate !== today
    ) {
      const care = (owner.careProfile ?? {}) as { food?: string[] };
      const foodId = care.food?.[0];
      const foodLabel = foodId
        ? CARE_GROUPS[0].options.find((o) => o.id === foodId)?.label
        : null;
      const body = foodLabel
        ? `Через 2 дня ей может быть тяжело. Не спорь по мелочам, предложи помощь и принеси: ${foodLabel.toLowerCase()}.`
        : "Через 2 дня ей может быть тяжело. Не спорь по мелочам, предложи помощь по дому.";
      const payload = JSON.stringify({
        title: "⚠️ Штормовое предупреждение",
        body,
        url: "/today",
      });

      let stormFailed: string[] = [];
      for (const sub of subs) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
          sent++;
        } catch {
          stormFailed = [...stormFailed, sub.endpoint];
        }
      }
      if (stormFailed.length > 0) {
        const alive = subs.filter((s) => !stormFailed.includes(s.endpoint));
        await prisma.user.update({
          where: { id: partner.id },
          data: { pushSubs: alive as unknown as object, lastStormDate: today },
        });
      } else {
        await prisma.user.update({
          where: { id: partner.id },
          data: { lastStormDate: today },
        });
      }
      continue;
    }

    if (partner.lastPushDate === today) continue;

    // карточка дня
    const prompt = await prisma.dailyPrompt.findUnique({
      where: { coupleId_day: { coupleId: couple.id, day: today } },
    });
    if (!prompt) continue;

    const title = "Твоя подсказка на сегодня";
    const body = prompt.text.length > 120 ? prompt.text.slice(0, 120) + "…" : prompt.text;
    const payload = JSON.stringify({ title, body, url: "/today" });

    let failed: string[] = [];
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
        sent++;
      } catch {
        failed = [...failed, sub.endpoint];
      }
    }
    // чистим мёртвые подписки
    if (failed.length > 0) {
      const alive = subs.filter((s) => !failed.includes(s.endpoint));
      await prisma.user.update({
        where: { id: partner.id },
        data: { pushSubs: alive as unknown as object, lastPushDate: today },
      });
    } else {
      await prisma.user.update({
        where: { id: partner.id },
        data: { lastPushDate: today },
      });
    }
  }

  return NextResponse.json({ ok: true, sent });
}
