import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSos } from "@/lib/ai/generator";
import { canUseSos, consumeSos, SOS_DAILY_LIMIT } from "@/lib/sos";
import { SOS_FALLBACK } from "@/lib/ai/prompts";

// POST /api/sos — «я накосячил»: срочный план. Лимит 3/день.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const type = (body.type ?? "") as keyof typeof SOS_FALLBACK;
  if (!SOS_FALLBACK[type]) return NextResponse.json({ error: "bad type" }, { status: 400 });

  if (!(await canUseSos(session.user.id))) {
    return NextResponse.json({ error: "limit", left: 0 }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { members: true } } },
  });
  const owner = user?.couple?.members.find((m) => m.role === "OWNER");
  const careProfile = (owner?.careProfile ?? {}) as Record<string, unknown>;
  const locale: "ru" | "en" = user?.couple?.locale === "en" ? "en" : "ru";

  const result = await generateSos(type, careProfile as never, locale);
  await consumeSos(session.user.id);

  return NextResponse.json({ ...result, left: SOS_DAILY_LIMIT - 1 });
}
