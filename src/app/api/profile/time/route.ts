import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/profile/time — когда присылать карточку дня (promptTime)
const TIMES = ["morning", "wake", "evening"];

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { promptTime?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const promptTime = body.promptTime ?? null;
  if (promptTime !== null && !TIMES.includes(promptTime)) {
    return NextResponse.json({ error: "bad promptTime" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { promptTime },
  });

  return NextResponse.json({ ok: true });
}
