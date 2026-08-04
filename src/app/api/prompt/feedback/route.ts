import { NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyFeedback } from "@/lib/prompt";
import { track } from "@/lib/analytics";

// POST /api/prompt/feedback — { promptId, feedback: GOOD|MISSED|BAD }
// При GOOD: мгновенный пуш ОЛЕ — она видит конкретное действие в ленте заботы.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { promptId?: string; feedback?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (!["GOOD", "MISSED", "BAD"].includes(body.feedback ?? "")) {
    return NextResponse.json({ error: "invalid feedback" }, { status: 400 });
  }

  try {
    const { streak, unlocked } = await applyFeedback(
      String(body.promptId),
      body.feedback as "GOOD" | "MISSED" | "BAD",
      session.user.id
    );

    // Петля «Сделал»: он сделал → она узнаёт (пуш + лента заботы)
    if (body.feedback === "GOOD") {
      try {
        const prompt = await prisma.dailyPrompt.findUnique({
          where: { id: String(body.promptId) },
          include: { couple: { include: { members: true } } },
        });
        const owner = prompt?.couple?.members.find((m) => m.role === "OWNER");
        track("card_good", { userId: session.user.id, coupleId: prompt?.coupleId });
        const subs = (owner?.pushSubs ?? []) as { endpoint: string; keys: { p256dh: string; auth: string } }[];
        if (owner && prompt && subs.length > 0 && !owner.pausePartner) {
          const vapid = {
            subject: process.env.VAPID_SUBJECT ?? "mailto:sync@sync.app",
            publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
            privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
          };
          webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
          const short = prompt.text.length > 80 ? prompt.text.slice(0, 80) + "…" : prompt.text;
          const payload = JSON.stringify({
            title: "Он сделал! 💛",
            body: `«${short}» — уже в твоей ленте заботы`,
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
              where: { id: owner.id },
              data: { pushSubs: subs.filter((s) => !dead.includes(s.endpoint)) },
            });
          }
        }
      } catch {
        /* пуш не критичен */
      }
    }

    if (body.feedback === "BAD") track("card_bad", { userId: session.user.id });
    if (body.feedback === "MISSED") track("card_missed", { userId: session.user.id });

    return NextResponse.json({ ok: true, streak, unlocked });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message ?? "failed" }, { status: 500 });
  }
}