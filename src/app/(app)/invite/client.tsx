"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Share2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

function InviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState<string | null>(
    (params.get("code") ?? "").toUpperCase().slice(0, 6) || null
  );
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/pair");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            if (data.inviteCode) setCode(data.inviteCode); // сервер — источник истины
            if (data.partnerJoined) setJoined(true);
          }
        }
      } catch {
        // сеть — просто пропускаем тик
      }
    }
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [code]);

  useEffect(() => {
    if (joined) {
      const t = setTimeout(() => router.push("/today"), 1600);
      return () => clearTimeout(t);
    }
  }, [joined, router]);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function share() {
    if (!code) return;
    const nav = navigator as Navigator & {
      share?: (data: { text?: string; url?: string }) => Promise<void>;
    };
    const shareUrl = `${window.location.origin}/register?code=${code}`;
    const text = `Скачай sync — это спасет твою жизнь 😄 Код: ${code}`;
    try {
      if (nav.share) {
        await nav.share({ text, url: shareUrl });
        return;
      }
    } catch {}
    await copy();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md flex flex-col items-center text-center"
    >
      <h1 className="text-[26px] font-extrabold text-ink leading-tight">
        {joined ? "Он принял код 🎉" : "Отправь ему код"}
      </h1>
      <p className="text-[14px] font-semibold text-muted mt-2 max-w-xs">
        {joined
          ? "Пара собрана. Переходим к подсказкам…"
          : "Один раз настроила — и он перестанет гадать, что с тобой не так."}
      </p>

      {!joined && (
        <>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 20 }}
            className="mt-8 rounded-[28px] bg-surface shadow-[0_16px_48px_rgba(232,131,127,.2)] px-10 py-8"
          >
            <div className="text-[44px] font-extrabold tracking-[0.35em] text-ink pl-[0.35em] bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              {code ?? "······"}
            </div>
            <button
              onClick={copy}
              className="mt-5 inline-flex items-center gap-2 text-[14px] font-bold text-primary"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Скопировано" : "Скопировать код"}
            </button>
          </motion.div>

          <Button full className="mt-6" onClick={share}>
            <Share2 size={18} />
            Отправить ему приглашение
          </Button>

          <div className="mt-8 flex items-center gap-2 text-muted">
            <Loader2 size={15} className="animate-spin" />
            <span className="text-[13px] font-bold">Ждём, пока он введёт код…</span>
          </div>
        </>
      )}

      {joined && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="mt-8 w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_12px_36px_rgba(232,131,127,.45)]"
        >
          <Check size={36} className="text-white" strokeWidth={3} />
        </motion.div>
      )}
    </motion.div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md h-64 rounded-[28px] bg-white/60 animate-pulse" />}>
      <InviteInner />
    </Suspense>
  );
}
