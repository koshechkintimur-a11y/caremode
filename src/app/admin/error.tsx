"use client";

// Видимая ошибка вместо пустого экрана (Safari «только фон» → увидим причину)
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const msg = `${error?.message ?? ""} ${error?.digest ?? ""}`.trim() || "неизвестная ошибка";

  return (
    <div className="min-h-screen bg-[#0F1520] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl bg-[#1A2332] border border-[#2A3A52] p-8 text-center">
        <div className="text-[20px] font-extrabold text-white">Ошибка админки</div>
        <p className="mt-3 text-[13px] font-semibold text-red-400 break-all">{msg}</p>
        <button
          onClick={reset}
          className="mt-5 h-[46px] px-6 rounded-full bg-gradient-to-br from-[#E8877F] to-[#F2C94C] text-[#1A2332] font-extrabold text-[14px]"
        >
          Обновить
        </button>
      </div>
    </div>
  );
}
