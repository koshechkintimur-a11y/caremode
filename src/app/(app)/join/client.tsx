"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);

  // searchParams резолвится после гидрации — код из ссылки применяем
  // «настройкой состояния во время рендера» (санкционированный React-паттерн)
  const paramCode = (params.get("code") ?? "").toUpperCase().slice(0, 6);
  if (paramCode && code !== paramCode) setCode(paramCode);

  async function submit() {
    if (code.length !== 6) {
      setError("Код — это 6 символов. Проверь у неё в приложении.");
      setShake((s) => s + 1);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/pair/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: code }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push("/onboarding/partner");
      return;
    }
    setError(data.error ?? "Не получилось. Попробуй ещё раз.");
    setShake((s) => s + 1);
    setBusy(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md flex flex-col items-center text-center"
    >
      <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center">
        <KeyRound size={26} className="text-primary" />
      </div>
      <h1 className="mt-5 text-[26px] font-extrabold text-ink leading-tight">Введи код пары</h1>
      <p className="text-[14px] font-semibold text-muted mt-2 max-w-xs">
        Она ждёт. Не заставляй её ждать долго — ирония в подсказках будет мягче.
      </p>

      <motion.div
        key={shake}
        animate={shake > 0 ? { x: [0, -8, 8, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="mt-8 w-full"
      >
        <input
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6)
            )
          }
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="XXXXXX"
          autoFocus
          className="w-full text-center text-[32px] font-extrabold tracking-[0.3em] pl-[0.3em] h-[72px] rounded-3xl bg-surface border-2 border-line outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition text-ink placeholder:text-muted/30"
        />
      </motion.div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-[13px] font-bold text-danger"
        >
          {error}
        </motion.p>
      )}

      <Button full className="mt-6" onClick={submit} disabled={busy || code.length !== 6}>
        {busy ? "Проверяем…" : "Войти в пару"}
        <ArrowRight size={18} />
      </Button>
    </motion.div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md h-64 rounded-[28px] bg-white/60 animate-pulse" />}>
      <JoinInner />
    </Suspense>
  );
}
