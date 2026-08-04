import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Yandex from "next-auth/providers/yandex";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  // Уникальное имя cookie: дефолтное authjs.session-token встречается у ВСЕХ
  // NextAuth-приложений — чужая cookie от другого проекта на localhost:3000
  // приводила к «no matching decryption secret» и редирект-циклам.
  cookies: {
    sessionToken: {
      name: "sync.session-token",
    },
  },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        // тип User расширен в types/next-auth.d.ts (role, coupleId)
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          coupleId: user.coupleId,
        };
      },
    }),
    // OAuth включаются только когда заданы ключи в .env
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET
      ? [
          Yandex({
            clientId: process.env.YANDEX_CLIENT_ID,
            clientSecret: process.env.YANDEX_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;
      try {
        const p = new URL(url);
        return p.pathname + p.search;
      } catch {
        return baseUrl;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        // OAuth: создаём/находим юзера по email (в БД — свой id, не uuid от провайдера)
        const email = String(user.email ?? "").toLowerCase().trim();
        if (email) {
          const dbUser = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
              email,
              passwordHash: null,
              role: "OWNER",
              firstName: user.name?.trim() || null,
              consentAt: new Date(), // вход через OAuth = принятие политики (см. /privacy)
            },
          });
          // регистрация (новый юзер) — метрика, без персональных данных
          if (dbUser.createdAt.getTime() > Date.now() - 30_000) {
            void import("@/lib/analytics").then(({ track }) => track("register", { userId: dbUser.id }));
          }
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.coupleId = dbUser.coupleId ?? null;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "OWNER" | "PARTNER";
        session.user.coupleId = (token.coupleId as string) ?? null;
      }
      return session;
    },
  },
});
