"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";

// Регистрация + вход одним вызовом. signIn в server action делает 303-редирект
// (NEXT_REDIRECT), поэтому клиентский signIn не нужен — он падает на URL-баге
// next-auth beta.32 + Next 16.
export async function registerUser(
  emailRaw: string,
  password: string,
  role: "OWNER" | "PARTNER",
  firstName?: string,
  consent?: boolean
): Promise<{ ok: boolean; error?: string }> {
  const email = emailRaw.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Похоже, это не email" };
  }
  if (password.length < 6) {
    return { ok: false, error: "Пароль должен быть не короче 6 символов" };
  }
  if (!consent) {
    return { ok: false, error: "Нужно согласие с политикой конфиденциальности" };
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { ok: false, error: "Этот email уже зарегистрирован. Войди." };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      firstName: firstName?.trim() || null,
      consentAt: new Date(),
    },
  });
  await signIn("credentials", {
    email,
    password,
    redirectTo: role === "OWNER" ? "/onboarding" : "/join",
  });
  return { ok: true };
}

// Логин через server action (тот же фикс URL-бага).
export async function loginUser(
  emailRaw: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const email = emailRaw.toLowerCase().trim();
  try {
    await signIn("credentials", { email, password, redirectTo: "/today" });
  } catch (e: unknown) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e; // штатный редирект
    return { ok: false, error: "Неверный email или пароль" };
  }
  return { ok: true };
}
