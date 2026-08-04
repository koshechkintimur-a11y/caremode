"use client";

// Async-хранилище для zustand persist: localStorage хранит только ШИФР,
// ключ — на сервере (один на аккаунт) + кэш в IndexedDB.
// Старый plaintext-стор (sync-device-v1) мигрируется автоматически.
// Каждое изменение: шифр в localStorage + отложенная синхронизация на сервер.

import type { StateStorage } from "zustand/middleware";
import { encryptVault, decryptVault, type VaultBlob } from "./vaultCrypto";

const PUSH_DEBOUNCE_MS = 2500;

let pushTimer: ReturnType<typeof setTimeout> | null = null;

function isBlob(x: unknown): x is VaultBlob {
  if (!x || typeof x !== "object") return false;
  const b = x as VaultBlob;
  return b.alg === "AES-GCM" && typeof b.iv === "string" && typeof b.ct === "string";
}

async function pushToServer(blob: VaultBlob) {
  try {
    await fetch("/api/cycle-vault", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blob }),
    });
  } catch {
    /* офлайн — синхронизируем при следующем изменении */
  }
}

export const cycleStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const raw = localStorage.getItem(name);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isBlob(parsed)) {
          // уже зашифровано — расшифровываем
          const data = await decryptVault(parsed);
          return JSON.stringify(data);
        }
        // старый plaintext — шифруем и сохраняем (миграция)
        const blob = await encryptVault(parsed);
        localStorage.setItem(name, JSON.stringify(blob));
        void pushToServer(blob);
        return raw;
      }
      // локально пусто — восстанавливаем из серверного vault (ярлык ↔ браузер)
      const res = await fetch("/api/cycle-vault");
      const data = await res.json();
      if (data?.blob && isBlob(data.blob)) {
        const dec = await decryptVault(data.blob);
        localStorage.setItem(name, JSON.stringify(data.blob));
        return JSON.stringify(dec);
      }
      return null;
    } catch {
      return null;
    }
  },

  setItem: async (name, value) => {
    try {
      const blob = await encryptVault(JSON.parse(value));
      localStorage.setItem(name, JSON.stringify(blob));
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        void pushToServer(blob);
      }, PUSH_DEBOUNCE_MS);
    } catch {
      /* шифрование недоступно — не пишем plaintext */
    }
  },

  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};
