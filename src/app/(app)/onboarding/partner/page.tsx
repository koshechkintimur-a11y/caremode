import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerSurvey } from "./client";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  // опрос — только для PARTNER в собранной паре
  if (user.role !== "PARTNER" || !user.coupleId) redirect("/today");

  return <PartnerSurvey />;
}
