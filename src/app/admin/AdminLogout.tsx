"use client";

export function AdminLogout() {
  return (
    <button
      onClick={async () => {
        await fetch("/api/admin/login", { method: "DELETE" });
        location.reload();
      }}
      className="text-[13px] font-bold text-slate-400 hover:text-white transition"
    >
      Выйти
    </button>
  );
}
