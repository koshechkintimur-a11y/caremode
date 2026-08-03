"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Heart, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { registerUser } from "../actions";

function RegisterInner() {
  const params = useSearchParams();
  const inviteCode = (params.get("code") ?? "").toUpperCase().slice(0, 6);

  const [role, setRole] = useState<"OWNER" | "PARTNER">("OWNER");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // настройка состояния во время рендера (без эффекта)
  if (inviteCode && role !== "PARTNER") setRole("PARTNER");

  async function submit() {
    setBusy(true);
    setError("");
    const res = await registerUser(email, password, role, firstName, consent);
    if (!res.ok) {
      setError(res.error ?? "Что-то пошло не так");
      setBusy(false);
      return;
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
        <h1 className="text-[24px] font-extrabold text-ink">Кто ты в этой паре?</h1>
        <p className="text-[14px] font-semibold text-muted mt-1 mb-6">
          От этого зависит, что ты увидишь
        </p>

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setRole("OWNER")}
            className={cn(
              "rounded-3xl p-5 text-left transition-colors border-2",
              role === "OWNER" ? "border-primary bg-primary-soft" : "border-line bg-surface"
            )}
          >
            <Heart size={22} className={role === "OWNER" ? "text-primary" : "text-muted"} />
            <div className="mt-3 text-[15px] font-extrabold text-ink">Я создаю пару</div>
            <div className="text-[12px] font-semibold text-muted mt-1 leading-snug">
              Настрою профиль заботы и приглашу партнёра
            </div>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setRole("PARTNER")}
            className={cn(
              "rounded-3xl p-5 text-left transition-colors border-2",
              role === "PARTNER" ? "border-primary bg-primary-soft" : "border-line bg-surface"
            )}
          >
            <KeyRound size={22} className={role === "PARTNER" ? "text-primary" : "text-muted"} />
            <div className="mt-3 text-[15px] font-extrabold text-ink">У меня есть код</div>
            <div className="text-[12px] font-semibold text-muted mt-1 leading-snug">
              Мне прислали приглашение — я вхожу в пару
            </div>
          </motion.button>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <Input
            placeholder="Как тебя зовут?"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Пароль (минимум 6 символов)"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <p className="mt-3 text-[12px] font-semibold text-muted">
          Это займёт 10 секунд. Данные цикла не хранятся на сервере.
        </p>

        {/* Обязательное согласие (152-ФЗ, ст. 9) */}
        <label className="mt-4 flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded-md accent-[#E8837F] shrink-0"
          />
          <span className="text-[12px] font-semibold text-muted leading-relaxed">
            Я соглашаюсь с{" "}
            <Link href="/privacy" className="text-primary font-extrabold">
              политикой конфиденциальности
            </Link>{" "}
            и на обработку персональных данных
          </span>
        </label>

        {inviteCode && (
          <div className="mt-3 rounded-2xl bg-bg px-4 py-3 text-[13px] font-bold text-ink">
            Тебя ждут по коду: <span className="text-primary tracking-[0.2em]">{inviteCode}</span>
          </div>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="mt-3 text-[13px] font-bold text-danger"
          >
            {error}
          </motion.p>
        )}

        <Button full className="mt-5" onClick={submit} disabled={busy || !consent}>
          {busy ? "Создаём…" : role === "OWNER" ? "Создать пару" : "Войти в пару"}
        </Button>
      </Card>

      <p className="text-center text-[12px] font-semibold text-muted mt-4 leading-relaxed">
        Продолжая, вы принимаете{" "}
        <Link href="/privacy" className="text-primary font-extrabold">
          политику конфиденциальности
        </Link>
      </p>

      <p className="text-center text-[14px] font-semibold text-muted mt-3">
        Уже с нами?{" "}
        <Link href="/login" className="text-primary font-extrabold">
          Войти
        </Link>
      </p>
    </motion.div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm h-64 rounded-[24px] bg-white/60 animate-pulse" />}>
      <RegisterInner />
    </Suspense>
  );
}
