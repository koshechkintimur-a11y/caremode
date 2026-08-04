import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// POST /api/admin/login — форма (urlencoded) или JSON → httpOnly-кука (7 дней).
// Успех: редирект на /admin. Ошибка: редирект на /admin?error=1.
export async function POST(req: Request) {
  let user = "";
  let pass = "";

  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await req.json()) as { user?: string; pass?: string };
    user = body.user ?? "";
    pass = body.pass ?? "";
  } else {
    const fd = await req.formData();
    user = String(fd.get("user") ?? "");
    pass = String(fd.get("pass") ?? "");
  }

  const adminUser = process.env.ADMIN_USER ?? "admin";
  const adminPass = process.env.ADMIN_PASS ?? "";

  // внешний base из заголовков nginx (req.url внутри — localhost:3000)
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "caremode.ru";
  const base = `${proto}://${host}`;

  const failUrl = `${base}/admin?error=1`;

  if (!adminPass || user !== adminUser || pass !== adminPass) {
    return NextResponse.redirect(failUrl, 303);
  }

  (await cookies()).set("admin_ok", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.redirect(`${base}/admin`, 303);
}

// POST /api/admin/logout — сброс куки
export async function DELETE() {
  (await cookies()).delete("admin_ok");
  return NextResponse.json({ ok: true });
}
