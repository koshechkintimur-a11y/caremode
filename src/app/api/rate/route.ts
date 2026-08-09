import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { track } from "@/lib/analytics";

// POST /api/rate — { stars: 1..5 } из модалки «Оцените приложение»
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { stars?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "invalid stars" }, { status: 400 });
  }

  track("rate", { userId: session.user.id, meta: { stars } });
  return NextResponse.json({ ok: true });
}
