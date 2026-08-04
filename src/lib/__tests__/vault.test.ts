import { describe, it, expect } from "vitest";
import { encryptJson, decryptJson } from "@/lib/vaultCrypto";

// Шифрование vault: roundtrip, повреждение данных, несовпадение ключа.
async function makeKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

describe("vaultCrypto", () => {
  it("roundtrip: шифр → расшифровка даёт исходные данные", async () => {
    const key = await makeKey();
    const data = { lastPeriodStart: "2026-08-01", cycleHistory: ["2026-07-01"], periodDays: [1, 2, 3] };
    const blob = await encryptJson(key, data);
    expect(blob.alg).toBe("AES-GCM");
    expect(blob.ct).not.toContain("2026-08-01"); // даты нет в открытом виде
    const dec = await decryptJson<typeof data>(key, blob);
    expect(dec).toEqual(data);
  });

  it("повреждённый шифр — ошибка (не тихий мусор)", async () => {
    const key = await makeKey();
    const blob = await encryptJson(key, { a: 1 });
    const tampered = { ...blob, ct: blob.ct.slice(0, -4) + "AAAA" };
    await expect(decryptJson(key, tampered)).rejects.toThrow();
  });

  it("чужой ключ не расшифровывает", async () => {
    const key1 = await makeKey();
    const key2 = await makeKey();
    const blob = await encryptJson(key1, { secret: "даты цикла" });
    await expect(decryptJson(key2, blob)).rejects.toThrow();
  });

  it("разные IV на каждое шифрование (нет одинаковых шифров)", async () => {
    const key = await makeKey();
    const data = { day: "2026-08-01" };
    const b1 = await encryptJson(key, data);
    const b2 = await encryptJson(key, data);
    expect(b1.iv).not.toBe(b2.iv);
    expect(b1.ct).not.toBe(b2.ct);
  });
});
