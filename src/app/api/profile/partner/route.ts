import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PARTNER_QUESTIONS, type PartnerProfile } from "@/lib/partnerContext";

const KEYS = PARTNER_QUESTIONS.map((q) => q.key);

// GET /api/profile/partner — текущий профиль партнёра (для префилла)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { partnerProfile: true },
  });
  return NextResponse.json({ partnerProfile: user?.partnerProfile ?? null });
}

// POST /api/profile/partner — сохранить ответы микро-опроса
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const profile: Record<string, string> = {};
  for (const key of KEYS) {
    const v = body[key];
    if (typeof v !== "string" || !v) return NextResponse.json({ error: `missing ${key}` }, { status: 400 });
    profile[key] = v;
  }

  const valid = PARTNER_QUESTIONS.every((q) =>
    q.options.some((o) => o.id === profile[q.key])
  );
  if (!valid) return NextResponse.json({ error: "invalid values" }, { status: 400 });

  const data: PartnerProfile = {
    reaction: profile.reaction as PartnerProfile["reaction"],
    painPoint: profile.painPoint as PartnerProfile["painPoint"],
    signalStyle: profile.signalStyle as PartnerProfile["signalStyle"],
    answeredAt: new Date().toISOString(),
  };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { partnerProfile: data as unknown as object },
  });

  return NextResponse.json({ ok: true });
}
