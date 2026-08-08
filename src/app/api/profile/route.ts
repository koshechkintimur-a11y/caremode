import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// GET /api/profile — имена (для «Привет, X» и блока «Пара»)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  let partnerFirstName: string | null = null;
  if (user.coupleId) {
    const couple = await prisma.coupleProfile.findUnique({
      where: { id: user.coupleId },
      include: { members: true },
    });
    const partner = couple?.members.find((m) => m.id !== user.id);
    partnerFirstName = partner?.firstName ?? null;
  }

  return NextResponse.json({
    firstName: user.firstName,
    partnerFirstName,
    role: user.role,
    coupleId: user.coupleId,
  });
}

// PUT /api/profile/name — { name } → User.firstName
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 30);
  if (!name) return NextResponse.json({ error: "empty name" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { firstName: name },
  });
  return NextResponse.json({ ok: true });
}

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
