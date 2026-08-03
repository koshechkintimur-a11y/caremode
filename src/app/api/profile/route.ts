import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// PUT /api/profile/care — OWNER сохраняет «профиль заботы»
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { careProfile?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { careProfile: (body.careProfile ?? {}) as Prisma.InputJsonValue },
  });
  return NextResponse.json({ ok: true });
}

// DELETE /api/profile — полное удаление данных (hard delete)
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (user.coupleId) {
    const couple = await prisma.coupleProfile.findUnique({ where: { id: user.coupleId } });
    if (couple) {
      if (couple.ownerId === user.id) {
        // каскадом удалятся все промпты пары
        await prisma.coupleProfile.delete({ where: { id: couple.id } });
      } else {
        await prisma.coupleProfile.update({
          where: { id: couple.id },
          data: { partnerId: null },
        });
      }
    }
  }

  await prisma.achievement.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  return NextResponse.json({ ok: true });
}
