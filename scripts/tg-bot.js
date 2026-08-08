// TG-бот: long polling + связка кода с аккаунтом.
// Запуск на VPS: pm2 start tg-bot.js --name tg-bot
// Токен — из .env приложения (BOT_TOKEN); API приложения — localhost:3000.
/* eslint-disable */

const fs = require("fs");
const path = require("path");

function loadEnv() {
  const p = path.join(__dirname, "..", ".env");
  try {
    const txt = fs.readFileSync(p, "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnv();

const TOKEN = process.env.BOT_TOKEN;
const API = "https://api.telegram.org/bot" + TOKEN;
const APP = "http://localhost:3000";
let offset = 0;

async function call(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return res.json();
}

async function handle(msg) {
  const chatId = String(msg.chat?.id);
  const text = String(msg.text ?? "").trim();
  if (!chatId || !text) return;

  const lower = text.toLowerCase();
  if (lower === "/start") {
    await call("sendMessage", {
      chat_id: chatId,
      text: "Привет! Это CareMode 💛\n\nЧтобы получать уведомления из приложения:\n1) Открой приложение → Настройки → Telegram\n2) Нажми «Подключить» — появится код\n3) Отправь этот код мне сюда.",
    });
    return;
  }

  // код связки: 6 символов (без 0/O/1/I)
  if (/^[A-Z0-9]{6}$/.test(lower)) {
    const res = await fetch(`${APP}/api/tg/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: lower, chatId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      await call("sendMessage", {
        chat_id: chatId,
        text: `Готово! ${data.firstName ? data.firstName + ", " : ""}уведомления подключены 💛\nТеперь ты будешь получать: карточки дня, её настроение, просьбы и благодарности.`,
      });
    } else {
      await call("sendMessage", {
        chat_id: chatId,
        text: "Код не найден или устарел. Открой приложение → Настройки → Telegram → «Подключить» и попробуй ещё раз.",
      });
    }
    return;
  }

  await call("sendMessage", {
    chat_id: chatId,
    text: "Отправь код из приложения (6 символов), чтобы подключить уведомления CareMode 💛",
  });
}

async function loop() {
  try {
    const data = await call("getUpdates", { offset, timeout: 30 });
    if (data.ok && Array.isArray(data.result)) {
      for (const upd of data.result) {
        offset = upd.update_id + 1;
        if (upd.message) await handle(upd.message).catch(() => {});
      }
    }
  } catch (e) {
    console.error("[tg-bot] loop error:", e.message);
  }
  setTimeout(loop, 1500);
}

console.log("[tg-bot] started, token:", TOKEN ? "ok" : "MISSING");
loop();
