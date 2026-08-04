import { NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/prompt/thank — OWNER нажимает «Заметил 💛» на действие в ленте заботы.
// Парню уходит статус «Она заметила» + пуш. Только позитивный контур.
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.coupleId) return NextResponse.json({ error: "no couple" }, { status: 409 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { promptId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.promptId) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const prompt = await prisma.dailyPrompt.findUnique({ where: { id: body.promptId } });
  if (!prompt || prompt.coupleId !== user.coupleId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (prompt.feedback !== "GOOD" || prompt.thankedAt) {
    return NextResponse.json({ error: "nothing to thank" }, { status: 400 });
  }

  await prisma.dailyPrompt.update({
    where: { id: prompt.id },
    data: { thankedAt: new Date() },
  });

  // Пуш парню: «Она заметила» — эмоциональная награда петли
  try {
    const couple = await prisma.coupleProfile.findUnique({
      where: { id: user.coupleId },
      include: { members: true },
    });
    const partner = couple?.members.find((m) => m.role === "PARTNER");
    const subs = (partner?.pushSubs ?? []) as { endpoint: string; keys: { p256dh: string; auth: string } }[];
    if (partner && subs.length > 0) {
      const vapid = {
        subject: process.env.VAPID_SUBJECT ?? "mailto:sync@sync.app",
        publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
        privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
      };
      webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
      const short = prompt.text.length > 60 ? prompt.text.slice(0, 60) + "…" : prompt.text;
      const payload = JSON.stringify({
        title: "Она заметила 💛",
        body: `«${short}» — ты сделал её день чуть лучше`,
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
    /* пуш не критичен */
  }

  return NextResponse.json({ ok: true });
}
