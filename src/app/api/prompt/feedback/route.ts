import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { applyFeedback } from "@/lib/prompt";

// POST /api/prompt/feedback — { promptId, feedback: GOOD|MISSED|BAD }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { promptId?: string; feedback?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (!["GOOD", "MISSED", "BAD"].includes(body.feedback ?? "")) {
    return NextResponse.json({ error: "invalid feedback" }, { status: 400 });
  }

  try {
    const { streak, unlocked } = await applyFeedback(
      String(body.promptId),
      body.feedback as "GOOD" | "MISSED" | "BAD",
      session.user.id
    );
    return NextResponse.json({ ok: true, streak, unlocked });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message ?? "failed" }, { status: 500 });
  }
}
