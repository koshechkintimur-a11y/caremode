import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/profile/pause — режим инкогнито: партнёр видит нейтральную «паузу»
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { pausePartner?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { pausePartner: Boolean(body.pausePartner) },
  });

  return NextResponse.json({ ok: true });
}
