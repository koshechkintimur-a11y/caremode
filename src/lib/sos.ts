import "server-only";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";

// SOS-генерации: 3 в день на пользователя (анти-спам API)
export const SOS_DAILY_LIMIT = 3;

export async function canUseSos(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  const today = todayKey();
  const used = user.sosDate === today ? user.sosUsed : 0;
  return used < SOS_DAILY_LIMIT;
}

export async function consumeSos(userId: string): Promise<void> {
  const today = todayKey();
  await prisma.user.update({
    where: { id: userId },
    data: {
      sosDate: today,
      sosUsed: { increment: 1 },
    },
  });
}
