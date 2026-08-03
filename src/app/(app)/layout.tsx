import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, FlaskConical } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/ui/Logo";

// Layout приложения: только проверка сессии + шапка.
// Маршрутизация по состоянию пары — в guard'ах каждой страницы (без циклов).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  // Навигатор цикла: тонкая полоска в шапке — по данным OWNER пары (с его согласия)
  const owner =
    user.role === "OWNER"
      ? user
      : user.coupleId
        ? (await prisma.coupleProfile.findUnique({ where: { id: user.coupleId }, include: { members: true } }))
            ?.members.find((m) => m.role === "OWNER") ?? null
        : null;
  const dayStates = (owner?.dayStates ?? {}) as Record<string, string>;
  const showCycle = !!owner && owner.cycleDayVisible && owner.cycleDay !== null;
  const cycleDay = owner?.cycleDay ?? null;

  return (
    <div className="flex-1 flex flex-col relative z-10">
      {/* роль для дефолтной темы (читает FOUC-скрипт и ThemeProvider) */}
      <meta name="sync-role" content={user.role} />
      <header className="flex items-center justify-between px-5 pt-5 pb-1">
        <Link href="/today">
          <Logo size={34} />
        </Link>
        <div className="flex items-center gap-2">
          {/* бутылка = инструкция (якорь) */}
          <Link
            href="/instruction"
            className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center active:scale-95 transition"
            aria-label="Послание"
          >
            <FlaskConical size={17} className="text-primary" />
          </Link>
          <Link
            href="/settings"
            className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center active:scale-95 transition"
            aria-label="Настройки"
          >
            <Settings size={18} className="text-muted" />
          </Link>
        </div>
      </header>
      {showCycle && (
        <div className="flex gap-[3px] px-5 pb-1" aria-hidden>
          {Array.from({ length: 28 }, (_, i) => {
            const d = i + 1;
            const st = dayStates[String(d)];
            const color = st === "red" ? "#E05C5C" : st === "yellow" ? "#F2C94C" : st === "green" ? "#7ED17E" : null;
            return (
              <div
                key={d}
                className={`h-[5px] flex-1 rounded-full ${
                  color ? "" : d <= cycleDay! ? "bg-primary/50" : "bg-line"
                } ${d === cycleDay ? "ring-2 ring-white/90" : ""}`}
                style={color ? { backgroundColor: color } : undefined}
              />
            );
          })}
        </div>
      )}
      <main className="relative z-10 flex-1 flex flex-col items-center px-5 py-6">{children}</main>
    </div>
  );
}
