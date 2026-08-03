import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InviteClient from "./client";

export default async function InvitePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  if (!user.coupleId) redirect("/onboarding");
  const couple = await prisma.coupleProfile.findUnique({ where: { id: user.coupleId } });
  if (couple?.partnerId) redirect("/today"); // партнёр уже присоединился
  return <InviteClient />;
}
