import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "OWNER" | "PARTNER";
    coupleId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: "OWNER" | "PARTNER";
      coupleId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "OWNER" | "PARTNER";
    coupleId?: string | null;
  }
}
