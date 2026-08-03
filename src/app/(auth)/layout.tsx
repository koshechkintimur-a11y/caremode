import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";

// Редирект «уже залогинен» — здесь, с настоящей валидацией JWT.
// middleware этого не делает (только наличие cookie), поэтому в нём
// такого редиректа нет: иначе битая cookie = бесконечный цикл.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.id) redirect("/today");

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 relative z-10">
      <div className="mb-8">
        <Logo size={44} />
      </div>
      {children}
    </div>
  );
}
