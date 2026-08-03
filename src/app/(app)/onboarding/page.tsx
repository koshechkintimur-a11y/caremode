import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./client";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  // OWNER может перепроходить онбординг — это режим редактирования «инструкции» (даже в паре)
  if (user.role !== "OWNER") redirect(user.coupleId ? "/today" : "/join");
  return <OnboardingClient />;
}
