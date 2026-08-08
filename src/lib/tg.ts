import "server-only";

// Отправка Telegram-уведомлений через Bot API (без библиотек).
// Токен бота — в .env (BOT_TOKEN). Если токена нет — тихо пропускаем.

const API = "https://api.telegram.org";

export interface TgUser {
  tgChatId: string | null;
  pausePartner: boolean;
}

export async function sendTg(
  user: TgUser | null | undefined,
  text: string,
  photo?: string // dataURL (jpeg/png) — уйдёт как sendPhoto с подписью
): Promise<boolean> {
  if (!user?.tgChatId) return false;
  if (user.pausePartner) return false;
  const token = process.env.BOT_TOKEN;
  if (!token) return false;

  try {
    if (photo) {
      // sendPhoto принимает файл multipart'ом (Node 22: FormData + Blob)
      const [meta, b64] = photo.split(",");
      const mime = meta?.includes("image/png") ? "image/png" : "image/jpeg";
      const form = new FormData();
      form.append("chat_id", String(user.tgChatId));
      form.append("photo", new Blob([Buffer.from(b64 ?? photo, "base64")], { type: mime }), "photo.jpg");
      form.append("caption", text);
      form.append("parse_mode", "HTML");
      const res = await fetch(`${API}/bot${token}/sendPhoto`, { method: "POST", body: form });
      return res.ok;
    }
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.tgChatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Сообщения событий (единый стиль для обеих сторон)
export const TG_MSGS = {
  cardForHim: (text: string) =>
    `💌 <b>Подсказка для тебя</b>\n\n${text}\n\nОткрой приложение и отметь «Сделал ✓»`,
  sheMood: (moodLabel: string) =>
    `🌤 Она отметила настроение: <b>${moodLabel}</b>\nОна хочет, чтобы ты это знал.`,
  sheNeeds: (need: string) => `🤗 Она просит: <b>${need}</b>\nСамое время среагировать.`,
  storm: `⛈ <b>Штормовое предупреждение</b>\nОна на пределе. Сегодня — просто будь рядом, без вопросов и советов.`,
  supplies: `🩸 <b>Закончились прокладки</b>\nЗаехать в магазин? Она будет рада — на опережение.`,
  suppliesDone: `🛒 <b>Он уже в магазине</b> 💛\nТы попросила — он поехал за прокладками.`,
  heDid: (action: string) => `💛 <b>Он сделал это!</b>\n«${action}» — уже в твоей ленте заботы.`,
  sheThanked: `✨ Она заметила и поблагодарила 💛\nТы сделал её день чуть лучше.`,
  ownerRemind: `💛 <b>Как ты сегодня?</b>\nОдин тап — и он получит подсказку.`,
  pairJoined: (name: string) =>
    `🎉 Пара собрана! ${name} подключился(ась).\nТеперь уведомления приходят обоим.`,
};
