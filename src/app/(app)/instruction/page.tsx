import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InstructionPage } from "./client";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { members: true } } },
  });
  if (!user) redirect("/login");
  if (!user.coupleId || !user.couple) {
    redirect(user.role === "OWNER" ? "/onboarding" : "/join");
  }

  return <InstructionPage role={user.role} />;
}
