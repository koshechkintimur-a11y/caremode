import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CalendarClient from "./client";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  if (!user.coupleId) redirect(user.role === "OWNER" ? "/onboarding" : "/join");
  return <CalendarClient />;
}
