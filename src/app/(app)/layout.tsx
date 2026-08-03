import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, FlaskConical } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/ui/Logo";
import { BackButton } from "@/components/ui/BackButton";

// Layout приложения: только проверка сессии + шапка.
// Маршрутизация по состоянию пары — в guard'ах каждой страницы (без циклов).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  return (
    <div className="flex-1 flex flex-col relative z-10">
      {/* роль для дефолтной темы (читает FOUC-скрипт и ThemeProvider) */}
      <meta name="sync-role" content={user.role} />
      <header className="flex items-center justify-between px-5 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <BackButton />
          <Link href="/today">
            <Logo size={34} />
          </Link>
        </div>
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
      <main className="relative z-10 flex-1 flex flex-col items-center px-5 py-6">{children}</main>
    </div>
  );
}
