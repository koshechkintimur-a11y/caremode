"use client";

import { useEffect, useRef } from "react";

// Пиксельная бутылка с посланием: canvas 48×64, покачивается на волнах.
// Тап — «откупоривается»: пробка улетает, из горлышка вылетают сердечки.
export function PixelBottle({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let wasOpen = open;
    const hearts: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

    const drawBottle = (t: number) => {
      const time = t / 1000;
      const w = 48, h = 64;
      ctx.clearRect(0, 0, w, h);

      // при открытии — выпускаем сердечки один раз
      if (open && !wasOpen) {
        for (let i = 0; i < 6; i++) {
          hearts.push({
            x: 24, y: 10,
            vx: (Math.random() - 0.5) * 1.8,
            vy: -1 - Math.random() * 1.5,
            life: 45 + Math.random() * 25,
          });
        }
        wasOpen = true;
      }

      const sway = Math.sin(time * 1.6) * 1.5;
      const ox = w / 2;
      const oy = h / 2;

      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate((sway * Math.PI) / 180);
      ctx.translate(-ox, -oy);

      // стекло («морское стекло»)
      ctx.fillStyle = "#2E6E7E";
      ctx.fillRect(17, 10, 14, 8);
      ctx.fillRect(15, 14, 18, 6);
      ctx.fillRect(10, 18, 28, 30);
      ctx.fillRect(14, 48, 20, 6);
      ctx.fillStyle = "#5FA8BC";
      ctx.fillRect(12, 20, 3, 18);
      // письмо внутри
      ctx.fillStyle = "#F5E9C8";
      ctx.fillRect(13, 26, 22, 18);
      ctx.fillStyle = "#3B2E3A";
      ctx.fillRect(16, 30, 16, 2);
      ctx.fillRect(16, 34, 12, 2);

      // пробка (если закрыта)
      if (!open) {
        ctx.fillStyle = "#8A5A3A";
        ctx.fillRect(19, 6, 10, 6);
        ctx.fillStyle = "#A8704C";
        ctx.fillRect(19, 6, 10, 2);
      }

      // сердечки
      hearts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.life -= 1;
        if (p.life > 0) {
          ctx.fillStyle = p.life % 2 === 0 ? "#E8837F" : "#F0A08C";
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 2, 2);
          ctx.fillRect(Math.floor(p.x) + 1, Math.floor(p.y) - 1, 2, 2);
        }
      });

      ctx.restore();

      // волны под бутылкой
      ctx.fillStyle = "#3E8AAE";
      for (let x = 0; x < w; x += 2) {
        const wy = 58 + Math.floor(Math.sin(x * 0.5 + time * 2) * 1.5);
        ctx.fillRect(x, wy, 2, h - wy);
      }
    };

    const loop = (t: number) => {
      drawBottle(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return (
    <canvas
      ref={ref}
      width={48}
      height={64}
      onClick={() => !open && onOpen()}
      className="cursor-pointer"
      style={{ imageRendering: "pixelated", width: 168, height: 224 }}
      aria-label="Бутылка с посланием"
    />
  );
}
