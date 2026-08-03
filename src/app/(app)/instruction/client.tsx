"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, X, KeyRound, Zap, Send, Share2, Pencil } from "lucide-react";
import { PixelBottle } from "@/components/PixelBottle";
import { shareCard } from "@/components/ShareCard";
import { genitive } from "@/lib/instruction";
import { useHydrated } from "@/lib/useHydrated";

interface Instruction {
  do: string[];
  dont: string[];
  passwordPhrase: string | null;
  superpower: string | null;
  updatedDaysAgo: number;
  ownerName: string | null;
}

interface Data {
  instruction: Instruction;
  role: "OWNER" | "PARTNER";
  ownerName: string | null;
  partnerName: string | null;
  partnerJoined: boolean;
  hasProfile: boolean;
}

export function InstructionPage({ role }: { role: "OWNER" | "PARTNER" }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [data, setData] = useState<Data | null>(null);
  const [opened, setOpened] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    fetch("/api/instruction")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setData(b))
      .catch(() => {});
    // его взгляд: бутылка открывается один раз
    if (role === "PARTNER" && localStorage.getItem("sync-bottle-opened") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- инициализация из localStorage после гидрации
      setOpened(true);
    }
  }, [hydrated, role]);

  function openBottle() {
    setOpened(true);
    localStorage.setItem("sync-bottle-opened", "1");
  }

  async function copyPhrase() {
    const phrase = data?.instruction.passwordPhrase;
    if (!phrase) return;
    try {
      await navigator.clipboard.writeText(phrase);
      setToast("Фраза-пароль скопирована 🔑");
      setTimeout(() => setToast(""), 2200);
    } catch {}
  }

  async function share() {
    if (!data) return;
    const text = [
      `КАК ЗАБОТИТЬСЯ ОБО МНЕ · личная шпаргалка${genitive(data.ownerName) ? ` ${genitive(data.ownerName)}` : ""}`,
      "",
      "ДЕЛАТЬ:",
      ...data.instruction.do.map((d) => `• ${d}`),
      "",
      "НЕ ДЕЛАТЬ:",
      ...data.instruction.dont.map((d) => `✕ ${d}`),
      ...(data.instruction.passwordPhrase
        ? ["", `ФРАЗА-ПАРОЛЬ: ${data.instruction.passwordPhrase}`]
        : []),
      ...(data.instruction.superpower ? ["", `СУПЕРСИЛА: ${data.instruction.superpower}`] : []),
    ].join("\n");
    try {
      await shareCard(text);
      setToast("Карточка готова — пост в сторис 🍾");
      setTimeout(() => setToast(""), 2600);
    } catch {
      setToast("Не вышло. Попробуй ещё раз.");
      setTimeout(() => setToast(""), 2600);
    }
  }

  if (!hydrated || !data) {
    return <div className="w-full max-w-md h-96 rounded-[28px] bg-surface/60 animate-pulse" />;
  }

  const ins = data.instruction;
  const herName = ins.ownerName ?? "Она";

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6">
      {/* бутылка — его взгляд */}
      {data.role === "PARTNER" && !opened ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5 pt-8"
        >
          <div className="font-pixel text-[11px] text-muted text-center leading-relaxed">
            Послание {genitive(herName) || "для тебя"}
          </div>
          <PixelBottle open={false} onOpen={openBottle} />
          <div className="text-[15px] font-bold text-muted">Бутылка прибилась к берегу</div>
          <button
            onClick={openBottle}
            className="h-[54px] px-8 rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[15px] shadow-[0_8px_24px_rgba(232,131,127,.4)] active:scale-[.97] transition"
          >
            Открыть
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full flex flex-col gap-5"
        >
          <div className="flex items-center justify-between">
            <h1 className="font-pixel text-[13px] text-ink leading-relaxed">
              {data.role === "OWNER"
                ? `Твоё послание для ${genitive(data.partnerName) || "него"}`
                : `Послание ${genitive(herName) || "для тебя"}`}
            </h1>
            {data.role === "OWNER" ? (
              <PixelBottle open onOpen={() => {}} />
            ) : (
              <PixelBottle open onOpen={() => {}} />
            )}
          </div>

          {data.role === "PARTNER" && (
            <div className="rounded-2xl bg-bg px-4 py-3 text-[12px] font-bold text-muted">
              Обновлено {ins.updatedDaysAgo === 0 ? "сегодня" : `${ins.updatedDaysAgo} ${plural(ins.updatedDaysAgo)} назад`}. Она старалась — читай внимательно.
            </div>
          )}

          {/* свиток */}
          <div className="rounded-[28px] bg-[#FFF6E8] shadow-[0_12px_40px_rgba(180,140,90,.25)] p-6 border border-[#EAD9B8]">
            <div className="text-center">
              <div className="font-pixel text-[10px] text-[#8A6A3A] tracking-widest">ТАЙНАЯ ШПАРГАЛКА</div>
              <div className="text-[20px] font-extrabold text-[#4A3826] mt-2">
                Как заботиться обо мне
              </div>
              <div className="text-[12px] font-semibold text-[#8A6A3A] mt-1">
                личная памятка · только для него
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <div className="text-[12px] font-extrabold uppercase tracking-wider text-[#4E7A5E] flex items-center gap-1.5">
                <Check size={14} /> Делать
              </div>
              {ins.do.map((d) => (
                <div key={d} className="text-[14px] font-semibold text-[#3A2E20] flex items-start gap-2">
                  <span className="text-[#4E7A5E] mt-0.5">•</span> {d}
                </div>
              ))}
              {ins.do.length === 0 && (
                <div className="text-[13px] font-semibold text-[#8A6A3A] italic">
                  Пока пусто — она дополнит
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <div className="text-[12px] font-extrabold uppercase tracking-wider text-[#A0524E] flex items-center gap-1.5">
                <X size={14} /> Не делать
              </div>
              {ins.dont.map((d) => (
                <div key={d} className="text-[14px] font-semibold text-[#3A2E20] flex items-start gap-2">
                  <span className="text-[#A0524E] mt-0.5">✕</span> {d}
                </div>
              ))}
            </div>

            {ins.passwordPhrase && (
              <button
                onClick={copyPhrase}
                className="mt-5 w-full rounded-2xl bg-[#E8837F]/15 border border-[#E8837F]/40 px-4 py-3 text-left"
              >
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#B05C58] flex items-center gap-1.5">
                  <KeyRound size={13} /> Фраза-пароль · тап = копировать
                </div>
                <div className="mt-1 text-[15px] font-extrabold text-[#4A3826]">
                  {ins.passwordPhrase}
                </div>
              </button>
            )}

            {ins.superpower && (
              <div className="mt-5 rounded-2xl bg-[#3B2E3A] px-4 py-3 text-center">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#F0A08C] flex items-center justify-center gap-1.5">
                  <Zap size={13} /> Её суперсила
                </div>
                <div className="mt-1 font-pixel text-[11px] text-[#F2C94C] leading-relaxed">
                  {ins.superpower}
                </div>
              </div>
            )}
          </div>

          {/* действия по роли */}
          {data.role === "OWNER" ? (
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  if (data.partnerJoined) {
                    setToast(
                      `${data.partnerName ? genitive(data.partnerName) + " уже" : "Он уже"} в паре — просто поделись ссылкой`
                    );
                    setTimeout(() => setToast(""), 2600);
                    return;
                  }
                  router.push("/invite");
                }}
                className="h-[54px] rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(232,131,127,.4)] active:scale-[.97] transition"
              >
                <Send size={17} />
                {data.partnerJoined ? "Пригласить ещё раз" : "Отправить партнёру"}
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={share}
                  className="h-[48px] rounded-full bg-surface border border-line text-ink font-bold text-[13px] flex items-center justify-center gap-2 active:scale-[.97] transition"
                >
                  <Share2 size={15} className="text-primary" /> Поделиться
                </button>
                <button
                  onClick={() => router.push("/onboarding")}
                  className="h-[48px] rounded-full bg-surface border border-line text-ink font-bold text-[13px] flex items-center justify-center gap-2 active:scale-[.97] transition"
                >
                  <Pencil size={15} className="text-primary" /> Переписать
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={share}
              className="h-[52px] rounded-full bg-surface border border-line text-ink font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[.97] transition"
            >
              <Share2 size={16} className="text-primary" /> Поделиться
            </button>
          )}
        </motion.div>
      )}

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink text-white text-[13px] font-bold px-5 py-3 rounded-full shadow-lg z-50"
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}

function plural(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "день";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "дня";
  return "дней";
}
