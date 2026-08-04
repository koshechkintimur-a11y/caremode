"use client";

// Vault: данные цикла шифруются AES-GCM ключом, который живёт на сервере
// (один ключ на аккаунт — поэтому синхронизация ярлык↔браузер работает без паролей).
// В БД и localStorage — только шифр. Ключ кэшируется в IndexedDB устройства.

import { get, set } from "idb-keyval";

export interface VaultBlob {
  v: 1;
  alg: "AES-GCM";
  iv: string;
  ct: string;
}

const KEY_ID = "caremode.vault.key.v1";
let memKey: CryptoKey | null = null;

function b64(bytes: Uint8Array): string {
  let b = "";
  for (let i = 0; i < bytes.length; i++) b += String.fromCharCode(bytes[i]);
  return btoa(b);
}

function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

export async function getVaultKey(): Promise<CryptoKey> {
  if (memKey) return memKey;
  try {
    const fromIdb = await get<CryptoKey>(KEY_ID);
    if (fromIdb) {
      memKey = fromIdb;
      return fromIdb;
    }
  } catch {
    /* IndexedDB недоступен — возьмём с сервера */
  }
  const res = await fetch("/api/cycle-vault");
  const data = await res.json();
  if (!data?.key) throw new Error("no vault key");
  const key = await crypto.subtle.importKey(
    "raw",
    unb64(data.key),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  memKey = key;
  try {
    await set(KEY_ID, key);
  } catch {
    /* не критично */
  }
  return key;
}

// чистые функции — тестируются в vitest
export async function encryptJson(key: CryptoKey, data: unknown): Promise<VaultBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  );
  return { v: 1, alg: "AES-GCM", iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}

export async function decryptJson<T>(key: CryptoKey, blob: VaultBlob): Promise<T> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(blob.iv) },
    key,
    unb64(blob.ct)
  );
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

export async function encryptVault(data: unknown): Promise<VaultBlob> {
  return encryptJson(await getVaultKey(), data);
}

export async function decryptVault(blob: VaultBlob): Promise<unknown> {
  return decryptJson(await getVaultKey(), blob);
}
