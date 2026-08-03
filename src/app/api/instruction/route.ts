import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildInstruction } from "@/lib/instruction";
import type { CareProfile } from "@/lib/fallback";

// GET /api/instruction — «Инструкция к ней» для обоих ролей.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { members: true } } },
  });
  if (!user?.coupleId || !user.couple) {
    return NextResponse.json({ error: "no couple" }, { status: 409 });
  }

  const owner = user.couple.members.find((m) => m.role === "OWNER");
  if (!owner) return NextResponse.json({ error: "no owner" }, { status: 409 });
  // имя партнёра = другого участника пары (не запрашивающего)
  const partner = user.couple.members.find((m) => m.id !== user.id);

  const care = (owner.careProfile ?? {}) as CareProfile;
  const instruction = buildInstruction(care, owner.updatedAt, owner.firstName);

  return NextResponse.json({
    instruction,
    role: user.role,
    ownerName: owner.firstName,
    partnerName: partner?.firstName ?? null,
    partnerJoined: Boolean(user.couple.partnerId),
    hasProfile: Boolean(care.food?.length || care.space?.length || care.words?.length),
  });
}
