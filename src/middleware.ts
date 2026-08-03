import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/onboarding", "/invite", "/join", "/today", "/settings", "/instruction", "/paywall", "/choose"];

// ВАЖНО: middleware видит только НАЛИЧИЕ cookie, но не её валидность.
// Поэтому редиректа «уже залогинен» (/login → /today) здесь НЕТ —
// он живёт в (auth)/layout.tsx с полноценной проверкой auth().
// Иначе битая cookie = бесконечный цикл login ↔ today.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // имя cookie — кастомное (см. src/lib/auth.ts), чтобы чужие
  // authjs.session-token от других приложений не ломали нам сессии
  const hasSession =
    req.cookies.has("sync.session-token") ||
    req.cookies.has("__Secure-sync.session-token");

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/onboarding/:path*",
    "/invite/:path*",
    "/join/:path*",
    "/today/:path*",
    "/settings/:path*",
  ],
};
