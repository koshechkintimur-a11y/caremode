import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AdminLogin } from "./AdminLogin";
import { AdminLogout } from "./AdminLogout";

// /admin — метрики для владельца (агрегаты, без персональных данных).

export const metadata = { title: "CareMode · админка" };

const DAY = 86_400_000;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TYPE_LABELS: Record<string, string> = {
  register: "Регистрации",
  pair_created: "Создали пару",
  partner_joined: "Партнёр вошёл",
  card_good: "Сделал ✓ (GOOD)",
  card_bad: "Не то (BAD)",
  card_missed: "Пропуск (MISSED)",
  sos: "SOS-план",
  need_now: "«Что нужно»",
  thank: "Заметила 💛",
  mood: "Отметки настроения",
  needs_space: "«Не трогать»",
  period_start: "Начало цикла",
  push_card: "Пуш: карточка",
  push_storm: "Пуш: шторм",
  push_owner_remind: "Пуш: напоминание ей",
  push_done: "Пуш: он сделал",
  push_thank: "Пуш: она заметила",
  remind_owner: "«Напомнить ей»",
  rate: "Оценки ⭐",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_ok")?.value !== "1") {
    const { error } = await searchParams;
    return <AdminLogin error={error === "1"} />;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 6 * DAY);
  const monthStart = new Date(todayStart.getTime() - 29 * DAY);

  const [usersTotal, pairsTotal, pairsWithPartner, activeToday, activeWeek, regs, goodCouples, byType, byDay, prompts, rateEvents] =
    await Promise.all([
      prisma.user.count(),
      prisma.coupleProfile.count(),
      prisma.coupleProfile.count({ where: { partnerId: { not: null } } }),
      prisma.user.count({ where: { lastSeenAt: { gte: todayStart } } }),
      prisma.user.count({ where: { lastSeenAt: { gte: weekStart } } }),
      prisma.user.findMany({ where: { createdAt: { gte: monthStart } }, select: { createdAt: true } }),
      // воронка «сделали GOOD»: уникальные пары с хотя бы одним GOOD (по БД, работает сразу)
      prisma.dailyPrompt.findMany({ where: { feedback: "GOOD" }, select: { coupleId: true } }),
      prisma.event.groupBy({ by: ["type"], _count: { _all: true } }),
      prisma.event.findMany({ where: { createdAt: { gte: weekStart } }, select: { type: true, createdAt: true } }),
      prisma.dailyPrompt.groupBy({ by: ["source", "feedback"], _count: { _all: true } }),
      prisma.event.findMany({
        where: { type: "rate" },
        select: { meta: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const regByDay: Record<string, number> = {};
  for (const r of regs) {
    const k = dayKey(r.createdAt);
    regByDay[k] = (regByDay[k] ?? 0) + 1;
  }
  const days7: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart.getTime() - i * DAY);
    days7.push(dayKey(d));
  }

  const didGood = new Set(goodCouples.map((c) => c.coupleId).filter(Boolean)).size;

  const typeCounts: Record<string, number> = {};
  for (const t of byType) typeCounts[t.type] = t._count._all;
  const typeCountsToday: Record<string, number> = {};
  const byDayMatrix: Record<string, Record<string, number>> = {};
  for (const e of byDay) {
    const k = dayKey(e.createdAt);
    byDayMatrix[k] ??= {};
    byDayMatrix[k][e.type] = (byDayMatrix[k][e.type] ?? 0) + 1;
    if (e.createdAt >= todayStart) typeCountsToday[e.type] = (typeCountsToday[e.type] ?? 0) + 1;
  }

  const aiCount = prompts.find((p) => p.source === "AI")?._count._all ?? 0;
  const fallbackCount = prompts.find((p) => p.source === "FALLBACK")?._count._all ?? 0;
  const goodCount = prompts.find((p) => p.feedback === "GOOD")?._count._all ?? 0;
  const badCount = prompts.find((p) => p.feedback === "BAD")?._count._all ?? 0;

  const actionTypes = Object.keys(TYPE_LABELS).filter((t) => (typeCounts[t] ?? 0) > 0);
  const totalActions = actionTypes.reduce((s, t) => s + (typeCounts[t] ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#0F1520] text-slate-200 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-extrabold text-white">CareMode · метрики</h1>
          <AdminLogout />
        </div>

        {/* Общие */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
          {[
            ["Пользователей", usersTotal],
            ["Пар", pairsTotal],
            ["Пар с партнёром", pairsWithPartner],
            ["Активны сегодня", activeToday],
            ["Активны 7 дней", activeWeek],
            ["Действий всего", totalActions],
          ].map(([label, v]) => (
            <div key={String(label)} className="rounded-2xl bg-[#1A2332] border border-[#2A3A52] p-4">
              <div className="text-[26px] font-extrabold text-white">{v}</div>
              <div className="text-[11px] font-bold text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Воронка */}
        <div className="rounded-2xl bg-[#1A2332] border border-[#2A3A52] p-5 mt-4">
          <h2 className="text-[15px] font-extrabold text-white">Воронка онбординга (уникальные юзеры)</h2>
          <div className="flex gap-2 mt-3 flex-wrap">
            {[
              ["Зарегистрировались", usersTotal],
              ["Создали пару", pairsTotal],
              ["Партнёр вошёл", pairsWithPartner],
              ["Сделали GOOD", didGood],
            ].map(([label, v], i, arr) => (
              <div key={String(label)} className="flex items-center gap-2">
                <div className="rounded-xl bg-[#0F1520] border border-[#2A3A52] px-4 py-2.5 text-center">
                  <div className="text-[18px] font-extrabold text-white">{v}</div>
                  <div className="text-[10px] font-bold text-slate-400">{label}</div>
                </div>
                {i < arr.length - 1 && <span className="text-slate-600">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Регистрации по дням */}
        <div className="rounded-2xl bg-[#1A2332] border border-[#2A3A52] p-5 mt-4">
          <h2 className="text-[15px] font-extrabold text-white">Регистрации · последние 7 дней</h2>
          <div className="flex gap-2 mt-3 flex-wrap">
            {days7.map((d) => (
              <div key={d} className="rounded-xl bg-[#0F1520] border border-[#2A3A52] px-3 py-2 text-center min-w-[64px]">
                <div className="text-[16px] font-extrabold text-white">{regByDay[d] ?? 0}</div>
                <div className="text-[10px] font-bold text-slate-400">{d.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Действия по типам */}
        <div className="rounded-2xl bg-[#1A2332] border border-[#2A3A52] p-5 mt-4">
          <h2 className="text-[15px] font-extrabold text-white">Действия · всего / сегодня</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            {actionTypes.map((t) => (
              <div key={t} className="rounded-xl bg-[#0F1520] border border-[#2A3A52] px-3 py-2.5">
                <div className="text-[16px] font-extrabold text-white">
                  {typeCounts[t]} <span className="text-[11px] font-bold text-[#F2C94C]">+{typeCountsToday[t] ?? 0}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400">{TYPE_LABELS[t] ?? t}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Оценки приложения */}
        <div className="rounded-2xl bg-[#1A2332] border border-[#2A3A52] p-5 mt-4">
          <h2 className="text-[15px] font-extrabold text-white">Оценки приложения ⭐</h2>
          {rateEvents.length === 0 ? (
            <p className="text-[12px] font-bold text-slate-400 mt-3">Пока нет оценок — модалка появится у пар через сутки</p>
          ) : (
            <>
              {(() => {
                const dist = [0, 0, 0, 0, 0];
                for (const e of rateEvents) {
                  const s = Number((e.meta as { stars?: number } | null)?.stars ?? 0);
                  if (s >= 1 && s <= 5) dist[s - 1]++;
                }
                const total = dist.reduce((a, b) => a + b, 0);
                const avg = total ? (dist.reduce((a, b, i) => a + b * (i + 1), 0) / total).toFixed(2) : "—";
                return (
                  <div className="mt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[24px] font-extrabold text-white">{avg}</span>
                      <span className="text-[12px] font-bold text-slate-400">средняя · {total} оценок</span>
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                      {[5, 4, 3, 2, 1].map((s) => (
                        <div key={s} className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                          <span className="w-3">{s}⭐</span>
                          <div className="flex-1 h-[10px] rounded-full bg-[#0F1520] overflow-hidden">
                            <div
                              className="h-full bg-[#F2C94C]"
                              style={{ width: `${total ? (dist[s - 1] / total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="w-6 text-right text-white">{dist[s - 1]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-[11px] font-bold text-slate-400">
                      Последние:{" "}
                      {rateEvents.slice(0, 5).map((e, i) => (
                        <span key={i}>
                          {i > 0 && " · "}
                          <span className="text-[#F2C94C]">{"⭐".repeat(Number((e.meta as { stars?: number })?.stars ?? 0)) || "—"}</span>{" "}
                          <span className="text-slate-500">{e.createdAt.toISOString().slice(5, 10)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* По дням */}
        <div className="rounded-2xl bg-[#1A2332] border border-[#2A3A52] p-5 mt-4 overflow-x-auto">
          <h2 className="text-[15px] font-extrabold text-white">По дням (7) · ключевые действия</h2>
          <table className="mt-3 text-[12px] w-full">
            <thead>
              <tr className="text-slate-400 text-left">
                <th className="py-1 pr-4">День</th>
                {["card_good", "card_bad", "sos", "thank", "need_now", "mood", "register"].map((t) => (
                  <th key={t} className="py-1 pr-3 font-bold">{TYPE_LABELS[t] ?? t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days7.map((d) => (
                <tr key={d} className="border-t border-[#2A3A52]">
                  <td className="py-1.5 pr-4 font-bold text-white">{d.slice(5)}</td>
                  {["card_good", "card_bad", "sos", "thank", "need_now", "mood", "register"].map((t) => (
                    <td key={t} className="py-1.5 pr-3 text-slate-300">{byDayMatrix[d]?.[t] ?? 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ИИ */}
        <div className="rounded-2xl bg-[#1A2332] border border-[#2A3A52] p-5 mt-4">
          <h2 className="text-[15px] font-extrabold text-white">Карточки · ИИ vs fallback · реакции</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            {[
              ["ИИ-карточки", aiCount],
              ["Fallback", fallbackCount],
              ["GOOD", goodCount],
              ["BAD", badCount],
            ].map(([label, v]) => (
              <div key={String(label)} className="rounded-xl bg-[#0F1520] border border-[#2A3A52] px-3 py-2.5">
                <div className="text-[16px] font-extrabold text-white">{v}</div>
                <div className="text-[10px] font-bold text-slate-400">{label}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-2">
            Доля GOOD: {aiCount + fallbackCount > 0 ? Math.round((goodCount / (aiCount + fallbackCount)) * 100) : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}
