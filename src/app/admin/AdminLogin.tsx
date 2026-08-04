"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setErr("Неверный логин или пароль");
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1520] flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl bg-[#1A2332] p-8 border border-[#2A3A52]"
      >
        <h1 className="text-[22px] font-extrabold text-white text-center">CareMode · админка</h1>
        <p className="text-[12px] font-semibold text-slate-400 text-center mt-1 mb-6">
          только для владельца
        </p>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Логин"
          autoComplete="username"
          className="w-full h-[46px] rounded-2xl bg-[#0F1520] border border-[#2A3A52] px-4 text-white text-[14px] font-semibold outline-none focus:border-[#4A6A9A] mb-3"
        />
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Пароль"
          autoComplete="current-password"
          className="w-full h-[46px] rounded-2xl bg-[#0F1520] border border-[#2A3A52] px-4 text-white text-[14px] font-semibold outline-none focus:border-[#4A6A9A]"
        />
        {err && <div className="mt-3 text-[13px] font-bold text-red-400">{err}</div>}
        <button
          type="submit"
          className="mt-5 w-full h-[48px] rounded-full bg-gradient-to-br from-[#E8877F] to-[#F2C94C] text-[#1A2332] font-extrabold text-[15px] active:scale-[.97] transition"
        >
          Войти
        </button>
      </form>
    </div>
  );
}
