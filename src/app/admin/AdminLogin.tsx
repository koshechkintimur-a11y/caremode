"use client";

// Чистая HTML-форма (работает без JS-гидрации): нативная отправка на роут,
// роут сам ставит куку и редиректит на /admin (или /admin?error=1).

export function AdminLogin({ error }: { error?: boolean }) {
  return (
    <div className="min-h-screen bg-[#0F1520] flex items-center justify-center p-6">
      <form
        action="/api/admin/login"
        method="POST"
        className="w-full max-w-sm rounded-3xl bg-[#1A2332] p-8 border border-[#2A3A52]"
      >
        <h1 className="text-[22px] font-extrabold text-white text-center">CareMode · админка</h1>
        <p className="text-[12px] font-semibold text-slate-400 text-center mt-1 mb-6">
          только для владельца
        </p>
        <input
          name="user"
          placeholder="Логин"
          autoComplete="username"
          className="w-full h-[46px] rounded-2xl bg-[#0F1520] border border-[#2A3A52] px-4 text-white text-[14px] font-semibold outline-none focus:border-[#4A6A9A] mb-3"
        />
        <input
          type="password"
          name="pass"
          placeholder="Пароль"
          autoComplete="current-password"
          className="w-full h-[46px] rounded-2xl bg-[#0F1520] border border-[#2A3A52] px-4 text-white text-[14px] font-semibold outline-none focus:border-[#4A6A9A]"
        />
        {error && (
          <div className="mt-3 text-[13px] font-bold text-red-400">
            Неверный логин или пароль
          </div>
        )}
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
