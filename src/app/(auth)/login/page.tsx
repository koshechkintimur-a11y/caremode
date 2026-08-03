"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginUser } from "../actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // OAuth-кнопки видны только когда ключи заданы в .env (NEXT_PUBLIC — публичный ID)
  const googleOn = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const yandexOn = Boolean(process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID);

  async function submit() {
    setBusy(true);
    setError("");
    const res = await loginUser(email, password);
    if (!res.ok) {
      setError(res.error ?? "Не получилось войти");
      setBusy(false);
    }
    // при успехе — 303-редирект от server action, сюда не возвращаемся
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm"
    >
      <Card className="p-7">
        <h1 className="font-pixel text-[20px] text-ink leading-relaxed">С возвращением</h1>
        <p className="text-[14px] font-semibold text-muted mt-1 mb-6">
          Ваша пара уже скучала по подсказкам
        </p>

        <div className="flex flex-col gap-3">
          <Input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Пароль"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="mt-3 text-[13px] font-bold text-danger"
          >
            {error}
          </motion.p>
        )}

        <Button full className="mt-5" onClick={submit} disabled={busy}>
          {busy ? "Входим…" : "Войти"}
        </Button>

        {(googleOn || yandexOn) && (
          <>
            <div className="flex items-center gap-3 mt-6">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[11px] font-bold text-muted uppercase tracking-wide">или</span>
              <div className="h-px flex-1 bg-line" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {googleOn && (
                <button
                  onClick={() => signIn("google", { callbackUrl: "/today" })}
                  className="h-[44px] rounded-2xl border border-line bg-surface flex items-center justify-center gap-2 text-[13px] font-extrabold text-ink transition active:scale-[.97]"
                >
                  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
                  </svg>
                  Google
                </button>
              )}
              {yandexOn && (
                <button
                  onClick={() => signIn("yandex", { callbackUrl: "/today" })}
                  className="h-[44px] rounded-2xl border border-line bg-surface flex items-center justify-center gap-2 text-[13px] font-extrabold text-ink transition active:scale-[.97]"
                >
                  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                    <path fill="#FC3F1D" d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4zm3.4 27.4H24V26h-4.6v-6.3c0-4.2 2.4-6.7 6.5-6.7 1.9 0 3.9.3 5.9.9l-.8 3.6c-1.5-.4-3-.6-4.2-.6-2.1 0-3.4 1.1-3.4 3.3V19.7h6.1V26h-4.1v5.4z" />
                  </svg>
                  Яндекс
                </button>
              )}
            </div>
          </>
        )}
      </Card>

      <p className="text-center text-[14px] font-semibold text-muted mt-5">
        Впервые здесь?{" "}
        <Link href="/register" className="text-primary font-extrabold">
          Создать пару
        </Link>
      </p>
      <p className="text-center text-[12px] font-semibold text-muted mt-3">
        Продолжая, вы принимаете{" "}
        <Link href="/privacy" className="text-primary font-extrabold">
          политику конфиденциальности
        </Link>
      </p>
    </motion.div>
  );
}
