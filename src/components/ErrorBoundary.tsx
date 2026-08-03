"use client";

import { Component, type ReactNode } from "react";

// Страховка от «белого экрана»: любая клиентская ошибка показывает
// сообщение с текстом ошибки вместо пустой страницы.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[sync] client error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="text-[20px] font-extrabold text-ink">Что-то пошло не так</div>
            <p className="mt-2 text-[13px] font-semibold text-muted break-all">
              {String(this.state.error)}
            </p>
            <button
              onClick={() => location.reload()}
              className="mt-5 h-[46px] px-6 rounded-full bg-gradient-to-br from-primary to-accent text-white font-extrabold text-[14px] active:scale-[.97] transition"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
