"use client";

// Шеринг-карточка: генерится на клиенте (canvas) — ноль нагрузки на сервер.
// Формат 1080×1350 (4:5) — сторис/Reels.

export async function shareCardPNG(text: string, locale: "ru" | "en" = "ru"): Promise<string> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // фон — фирменный градиент
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#E8837F");
  g.addColorStop(0.55, "#EA8D88");
  g.addColorStop(1, "#F0A08C");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // мягкие блики
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.beginPath();
  ctx.arc(W - 140, 120, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-60, H - 160, 260, 0, Math.PI * 2);
  ctx.fill();

  // лого
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 54px Nunito, system-ui, sans-serif";
  ctx.fillText("sync.", 76, 120);
  ctx.restore();

  // текст фразы — перенос по словам
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 58px Nunito, system-ui, sans-serif";
  ctx.textBaseline = "top";
  const maxWidth = W - 152;
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  let y = 300;
  for (const l of lines) {
    ctx.fillText(l, 76, y);
    y += 76;
  }

  // подпись
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.font = "700 34px Nunito, system-ui, sans-serif";
  ctx.fillText(
    locale === "en" ? "empathy translator · for couples" : "переводчик эмпатии · для пар",
    76,
    H - 130
  );

  return canvas.toDataURL("image/png");
}

export async function shareCard(
  text: string,
  locale: "ru" | "en" = "ru"
): Promise<"shared" | "downloaded" | "copied"> {
  const dataUrl = await shareCardPNG(text, locale);
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], "sync-card.png", { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data?: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string }) => Promise<void>;
  };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "sync" });
      return "shared";
    } catch {
      // пользователь отменил — не считаем ошибкой
    }
  }

  // фолбэк: скачивание
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = "sync-card.png";
  a.click();
  return "downloaded";
}
