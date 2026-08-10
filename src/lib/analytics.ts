import "server-only";
import { prisma } from "@/lib/prisma";

// Обезличенная аналитика: fire-and-forget запись события (никогда не роняет
// основную операцию). Без текстов карточек и дат цикла — только типы действий.

export type EventType =
  | "register"
  | "pair_created"
  | "partner_joined"
  | "card_good"
  | "card_bad"
  | "card_missed"
  | "sos"
  | "need_now"
  | "thank"
  | "mood"
  | "needs_space"
  | "period_start"
  | "period_end"
  | "push_card"
  | "push_storm"
  | "supplies"
  | "supplies_done"
  | "event_add"
  | "event_confirm"
  | "request_done"
  | "request_thank"
  | "request_movie"
  | "supplies_reset"
  | "event_remind"
  | "invite_remind"
  | "rate"
  | "period_ask"
  | "push_owner_remind"
  | "push_done"
  | "push_thank"
  | "remind_owner";

export function track(type: EventType, opts: { userId?: string | null; coupleId?: string | null; meta?: Record<string, unknown> } = {}) {
  void prisma.event
    .create({
      data: {
        type,
        userId: opts.userId ?? null,
        coupleId: opts.coupleId ?? null,
        meta: (opts.meta ?? undefined) as object | undefined,
      },
    })
    .catch(() => {});
}
