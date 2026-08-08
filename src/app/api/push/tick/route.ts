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

// локальная дата пары (РФ, UTC+3): события хранятся как локальные YYYY-MM-DD
function localKey(offsetDays: number): string {
  const d = new Date(Date.now() + 3 * 3600_000 + offsetDays * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
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
  let eventFound = 0;

  for (const couple of couples) {
    const partner = couple.members.find((m) => m.role === "PARTNER");
    const owner = couple.members.find((m) => m.role === "OWNER");
    if (!partner || !owner) continue;

    // ==== НАПОМИНАНИЯ О СОБЫТИЯХ ПАРЫ: сегодня/завтра — ТГ + Web Push обоим ====
    {
      const eventDate = localKey(0);
      const eventNext = localKey(1);
      const events = await prisma.coupleEvent.findMany({
        where: { coupleId: couple.id, date: { in: [eventDate, eventNext] }, remindedAt: null },
      });
      eventFound += events.length;
      if (events.length > 0) {
        console.log(`[tick] couple=${couple.id} dates=${eventDate},${eventNext} events=${events.length}`);
      }
      for (const ev of events) {
        const when = ev.date === eventDate ? "Сегодня" : "Завтра";
        const kindEmoji = { date: "💞", anniversary: "🎂", appointment: "🩺" }[ev.kind] ?? "📅";
        const text = `${kindEmoji} <b>${when}: ${ev.title}</b>\n\nНе потеряйте этот день.`;
        void import("@/lib/tg").then(({ sendTg }) => {
          sendTg(owner, text);
          sendTg(partner, text);
        });
        const payload = JSON.stringify({ title: `${kindEmoji} ${when}: ${ev.title}`, body: "Не потеряйте этот день.", url: "/today" });
        for (const m of [owner, partner]) {
          for (const sub of (m.pushSubs as PushSub[] | null) ?? []) {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
              sent++;
            } catch {}
          }
        }
        await prisma.coupleEvent.update({ where: { id: ev.id }, data: { remindedAt: new Date() } });
        void import("@/lib/analytics").then(({ track }) => track("event_remind", { coupleId: couple.id }));
      }
    }

    // ==== Пуш ОЛЕ: напоминание отметить настроение (если ещё не отметила сегодня) ====
    const ownerHour = owner.pushPromptTime ? Number(owner.pushPromptTime) : null;
    const ownerSubs = (owner.pushSubs as PushSub[] | null) ?? [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const ownerMoodToday =
      owner.moodUpdatedAt !== null &&
      new Date(owner.moodUpdatedAt).getTime() >= todayStart.getTime();
    if (
      owner.pushEnabled &&
      ownerSubs.length > 0 &&
      ownerHour !== null &&
      ownerHour === hour &&
      owner.lastPushDate !== today &&
      !ownerMoodToday
    ) {
      const payload = JSON.stringify({
        title: "Как ты сегодня? 💛",
        body: "Один тап — и он получит подсказку, как тебя поддержать.",
        url: "/today",
      });
      let ownerFailed: string[] = [];
      for (const sub of ownerSubs) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
          sent++;
          void import("@/lib/analytics").then(({ track }) => track("push_owner_remind", { userId: owner.id, coupleId: couple.id }));
          void import("@/lib/tg").then(({ sendTg, TG_MSGS }) => sendTg(owner, TG_MSGS.ownerRemind));
        } catch {
          ownerFailed = [...ownerFailed, sub.endpoint];
        }
      }
      if (ownerFailed.length > 0) {
        const alive = ownerSubs.filter((s) => !ownerFailed.includes(s.endpoint));
        await prisma.user.update({
          where: { id: owner.id },
          data: { pushSubs: alive as unknown as object, lastPushDate: today },
        });
      } else {
        await prisma.user.update({
          where: { id: owner.id },
          data: { lastPushDate: today },
        });
      }
    }

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
          void import("@/lib/analytics").then(({ track }) => track("push_storm", { userId: partner.id, coupleId: couple.id }));
          void import("@/lib/tg").then(({ sendTg, TG_MSGS }) => sendTg(partner, TG_MSGS.storm));
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
        void import("@/lib/analytics").then(({ track }) => track("push_card", { userId: partner.id, coupleId: couple.id }));
        void import("@/lib/tg").then(({ sendTg, TG_MSGS }) => sendTg(partner, TG_MSGS.cardForHim((prompt?.text ?? "").slice(0, 300))));
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

  return NextResponse.json({ ok: true, sent, eventFound });
}
