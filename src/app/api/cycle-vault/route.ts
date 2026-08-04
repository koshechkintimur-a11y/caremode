import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Vault цикла: GET — ключ (генерируется один раз) + зашифрованный блоб;
// PUT — сохранить новый блоб. Только OWNER. Сервер не видит даты — только шифр.

function isBlobShape(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const b = x as { v?: unknown; alg?: unknown; iv?: unknown; ct?: unknown };
  return (
    b.v === 1 &&
    b.alg === "AES-GCM" &&
    typeof b.iv === "string" &&
    b.iv.length > 0 &&
    typeof b.ct === "string" &&
    b.ct.length > 0
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let key = user.cycleVaultKey;
  if (!key) {
    key = randomBytes(32).toString("base64");
    await prisma.user.update({ where: { id: user.id }, data: { cycleVaultKey: key } });
  }

  return NextResponse.json({ key, blob: user.cycleVault ?? null });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { blob?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!isBlobShape(body.blob)) {
    return NextResponse.json({ error: "invalid blob" }, { status: 400 });
  }

  let key = user.cycleVaultKey;
  if (!key) {
    key = randomBytes(32).toString("base64");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { cycleVaultKey: key, cycleVault: body.blob as object },
  });

  return NextResponse.json({ ok: true });
}
