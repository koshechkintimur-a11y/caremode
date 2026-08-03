import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCashbackState, giveReward, REWARD_TEMPLATES } from "@/lib/cashback";

// GET /api/cashback — состояние кэшбэка для обоих ролей
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.coupleId) return NextResponse.json({ error: "no couple" }, { status: 409 });

  const state = await getCashbackState(user.coupleId);
  return NextResponse.json({ ...state, templates: REWARD_TEMPLATES, role: user.role });
}

// POST /api/cashback — OWNER выдаёт награду
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.coupleId) return NextResponse.json({ error: "no couple" }, { status: 409 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.text?.trim()) return NextResponse.json({ error: "empty text" }, { status: 400 });

  try {
    await giveReward(user.coupleId, body.text);
  } catch {
    return NextResponse.json({ error: "no reward available" }, { status: 409 });
  }

  const state = await getCashbackState(user.coupleId);
  return NextResponse.json({ ok: true, ...state });
}
