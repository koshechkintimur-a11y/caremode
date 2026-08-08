"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// События пары: OWNER отмечает в мини-календаре, PARTNER видит и подтверждает.
interface Ev {
  id: string;
  date: string;
  title: string;
  kind: string;
  label: string;
  confirmed: boolean;
  createdByMe: boolean;
}

const KIND_CHIPS: [string, string][] = [
  ["date", "💞 Свидание"],
  ["anniversary", "🎂 Годовщина"],
  ["appointment", "🩺 Приём"],
];

function fmtDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

export function EventsBlock({ role, toast }: { role: "OWNER" | "PARTNER"; toast: (t: string) => void }) {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("date");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/events");
      if (r.ok) setEvents((await r.json()).events ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- канонический fetch-on-mount
    load();
  }, [load]);

  // сетка текущего месяца
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Пн = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const m = String(month + 1).padStart(2, "0");
      const d = String(i + 1).padStart(2, "0");
      return `${year}-${m}-${d}`;
    }),
  ];
  const todayIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  async function addEvent() {
    if (!selDate || !title.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selDate, title: title.trim(), kind }),
      });
      if (r.ok) {
        setTitle("");
        setSelDate(null);
        setKind("date");
        toast(role === "OWNER" ? "Он уже знает — подтвердит в приложении 💞" : "Она уже знает 💞");
        load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirm(id: string) {
    const r = await fetch("/api/events/confirm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (r.ok) {
      setEvents((evs) => evs?.map((e) => (e.id === id ? { ...e, confirmed: true } : e)) ?? null);
      toast("Она узнает — ты в курсе ✓");
    }
  }

  const upcoming = (events ?? []).filter((e) => e.date >= todayIso).slice(0, 8);

  return (
    <div className="rounded-[24px] bg-surface/55 backdrop-blur-[16px] p-5 shadow-[0_8px_30px_rgba(232,131,127,.14)]">
      <div className="text-[15px] font-extrabold text-ink">События</div>
      <div className="text-[12px] font-semibold text-muted mt-0.5">
        {role === "OWNER"
          ? "отметь — он сразу увидит и подтвердит"
          : "она отмечает — подтверди, что ты в курсе"}
      </div>

      {role === "OWNER" && (
        <>
          {/* мини-календарь */}
          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
              <div key={d} className="text-[10px] font-bold text-muted py-1">{d}</div>
            ))}
            {cells.map((iso, i) => {
              if (!iso) return <div key={i} />;
              const has = (events ?? []).some((e) => e.date === iso);
              const isSel = selDate === iso;
              const isToday = iso === todayIso;
              return (
                <button
                  key={iso}
                  onClick={() => setSelDate(isSel ? null : iso)}
                  className={cn(
                    "relative h-9 rounded-xl text-[12px] font-bold transition-colors",
                    isSel
                      ? "bg-gradient-to-br from-primary to-accent text-white"
                      : "bg-surface/70 text-ink hover:bg-primary-soft",
                    isToday && !isSel && "ring-2 ring-primary/50"
                  )}
                >
                  {Number(iso.slice(8))}
                  {has && <span className={cn("absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full", isSel ? "bg-white" : "bg-primary")} />}
                </button>
              );
            })}
          </div>

          {/* форма добавления */}
          {selDate && (
            <div className="mt-3 rounded-2xl border border-line bg-surface/70 p-3">
              <div className="text-[12px] font-extrabold text-ink">{fmtDate(selDate)} — что это?</div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {KIND_CHIPS.map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={cn(
                      "h-[34px] px-3 rounded-full text-[11px] font-extrabold border transition-colors",
                      kind === k ? "bg-gradient-to-br from-primary to-accent text-white border-transparent" : "bg-surface text-ink border-line"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название (свидание у озера…)"
                maxLength={60}
                className="mt-2 w-full h-[42px] rounded-2xl bg-surface border border-line px-3 text-[13px] font-semibold text-ink outline-none focus:border-primary"
              />
              <button
                onClick={addEvent}
                disabled={!title.trim() || busy}
                className="mt-2 w-full h-[42px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[13px] disabled:opacity-40 active:scale-[.97] transition"
              >
                {busy ? "…" : "Добавить событие"}
              </button>
            </div>
          )}
        </>
      )}

      {/* список ближайших */}
      {upcoming.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {upcoming.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 rounded-2xl bg-surface/70 border border-line px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[12px] font-extrabold text-ink truncate">
                  {e.label} · {fmtDate(e.date)} — {e.title}
                </div>
                <div className="text-[10px] font-bold text-muted mt-0.5">
                  {e.confirmed
                    ? "✓ оба в курсе"
                    : e.createdByMe
                      ? "ждёт подтверждения партнёра…"
                      : "добавил(а) партнёр"}
                </div>
              </div>
              {!e.confirmed && !e.createdByMe && (
                <button
                  onClick={() => confirm(e.id)}
                  className="shrink-0 h-[32px] px-4 rounded-full bg-gradient-to-br from-primary to-accent text-white text-[11px] font-extrabold active:scale-[.95] transition"
                >
                  Подтвержу ✓
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {events !== null && upcoming.length === 0 && (
        <div className="mt-3 text-[12px] font-semibold text-muted">
          {role === "OWNER" ? "Тапни по дню в календаре — добавь свидание или приём" : "Событий пока нет — скоро появятся"}
        </div>
      )}
    </div>
  );
}
