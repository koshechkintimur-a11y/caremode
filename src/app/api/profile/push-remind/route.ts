import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/profile/push-remind — OWNER: напоминание «отметь настроение»
// (enabled — вкл/выкл, time — час: "9" | "10" | "20")
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { enabled?: boolean; time?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const time = body.time ?? null;
  if (time !== null && !["9", "10", "20"].includes(time)) {
    return NextResponse.json({ error: "invalid time" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { pushEnabled: Boolean(body.enabled), pushPromptTime: time },
  });

  return NextResponse.json({ ok: true });
}
