import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// POST /api/admin/login — { user, pass } → httpOnly-кука (7 дней)
export async function POST(req: Request) {
  let body: { user?: string; pass?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const adminUser = process.env.ADMIN_USER ?? "admin";
  const adminPass = process.env.ADMIN_PASS ?? "";

  if (!adminPass || body.user !== adminUser || body.pass !== adminPass) {
    return NextResponse.json({ error: "неверный логин или пароль" }, { status: 401 });
  }

  (await cookies()).set("admin_ok", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}

// POST /api/admin/logout
export async function DELETE() {
  (await cookies()).delete("admin_ok");
  return NextResponse.json({ ok: true });
}
