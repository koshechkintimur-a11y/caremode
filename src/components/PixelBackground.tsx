"use client";

import { useEffect, useRef } from "react";
import { useWeather, type WeatherKey } from "@/store/uiStore";

// Пиксельный океан-погода: канвас фиксирован на весь экран (как раньше).
// «Погружение» при прокрутке: горизонт поднимается, вода заливает экран,
// появляются рыбы/дельфин/скат (sun), акулы (rain), красные глаза (storm).
// Прокрутка вверх — возврат к небу. Никаких сдвигов канваса — только перерисовка.

const W = 240;
const H = 360;
const S = 2; // физический масштаб: канвас 480×720 — пиксели в 2 раза мельче

const SKY_FRAC = 0.62; // горизонт при dive=0 (как раньше)
const DIVE_MAX = 0.06; // горизонт при полном погружении

const DEEP: Record<WeatherKey, string> = {
  sun: "#0E3A5C",
  clouds: "#0A2E4C",
  rain: "#08263F",
  storm: "#040D1C",
};

interface Pal {
  sky: string[];
  sun: string;
  moon: string;
  star: string;
  cloud: string;
  cloudDark: string;
  rain: string;
  bolt: string;
  gull: string;
  water: string[];
  foam: string;
  shine: string;
}

const DAY: Record<WeatherKey, Pal> = {
  sun: {
    sky: ["#7FC8E0", "#8FD3E8", "#A0DCF0", "#B4E4F2", "#C8ECF4", "#DCF4F2", "#EAF7F0"],
    sun: "#FFD166", moon: "#F2E8C8", star: "#FFFFFF",
    cloud: "#F4F8F8", cloudDark: "#D8E8E8", rain: "#8FB4D8", bolt: "#F8FBFF",
    gull: "#3B5E70",
    water: ["#4E9BBF", "#4691B6", "#3E89AE", "#36809F", "#2E7A9E"], foam: "#EAF7F7", shine: "#B8E8F0",
  },
  clouds: {
    sky: ["#8FB8CC", "#9FC4D8", "#B0CFE0", "#C0D8E6", "#C8DCE8", "#D8E8EE", "#E2EEF0"],
    sun: "#F5D98A", moon: "#E8DCB8", star: "#FFFFFF",
    cloud: "#F2F4F4", cloudDark: "#D4DEE2", rain: "#7CA3C8", bolt: "#F8FBFF",
    gull: "#44586A",
    water: ["#4A8FAD", "#4287A5", "#3A7F9D", "#32779A", "#2A6F8D"], foam: "#DCF2F2", shine: "#A8D8E8",
  },
  rain: {
    sky: ["#5F7F95", "#6E8FA6", "#7C9FB5", "#8BAFC2", "#9ABFCE", "#A9CFDA", "#B8DFE6"],
    sun: "#E8C078", moon: "#C8C8C8", star: "#E8E8E8",
    cloud: "#A8B8C4", cloudDark: "#8496A4", rain: "#7CA3C8", bolt: "#F8FBFF",
    gull: "#2E4A5E",
    water: ["#3A6E8C", "#34667F", "#2E5E73", "#285768", "#224F5E"], foam: "#BFD8DE", shine: "#7CA3B8",
  },
  storm: {
    sky: ["#2B3546", "#333E52", "#3C4760", "#455070", "#4E5978", "#576282", "#606B8C"],
    sun: "#C8B06A", moon: "#B0B8C8", star: "#F0F4FF",
    cloud: "#3A4458", cloudDark: "#2A3344", rain: "#8FB4D8", bolt: "#FFE66A",
    gull: "#1E2A3A",
    water: ["#1E3A52", "#1A3348", "#162C3E", "#122534", "#0E1E2A"], foam: "#8CA3B0", shine: "#5A7A90",
  },
};

function parseCol(c: string): [number, number, number] {
  if (c.startsWith("#")) {
    const v = parseInt(c.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  const m = c.match(/(\d+),(\d+),(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseCol(a);
  const pb = parseCol(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function PixelBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(0);
  const vhRef = useRef(800);

  const weather = useWeather((s) => s.weather);

  useEffect(() => {
    const onScroll = () => {
      scrollRef.current = window.scrollY;
    };
    vhRef.current = window.innerHeight || 800;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      vhRef.current = window.innerHeight || 800;
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pal = DAY[weather];
    let raf = 0;

    const px = (x: number, y: number, w: number, h: number, c: string, a = 1) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = c;
      ctx.fillRect(x * S, y * S, w * S, h * S);
      ctx.globalAlpha = 1;
    };

    // рыбка (плывёт вправо/влево), детальная
    const fish = (fx: number, fy: number, col: string, flip: boolean, t: number) => {
      const tail = Math.floor(t * 6) % 2 === 0 ? 0 : 1;
      const x = flip ? fx - 5 : fx;
      const dir = flip ? -1 : 1;
      px(x, fy, 5, 2, col); // тело
      px(x + dir * 1, fy - 1, 2, 1, col); // спинной плавник
      px(x + dir * 4, fy + 1, 2, 1, "#FFFFFF", 0.45); // брюхо светлее
      px(x + dir * 5, fy + tail, 1, 2, col); // хвост
      px(x + dir * 2, fy, 1, 1, "#1B1626"); // глаз
      px(x + dir * 3, fy - 1, 1, 1, "#FFFFFF", 0.6); // блик
    };

    const draw = (t: number) => {
      const time = t / 1000;
      const dive = Math.min(1, Math.max(0, scrollRef.current / (vhRef.current * 0.9)));
      const horizon = Math.round(H * (SKY_FRAC * (1 - dive) + DIVE_MAX * dive));

      ctx.clearRect(0, 0, W * S, H * S);

      // ===== небо (0..horizon), плавный градиент =====
      for (let y = 0; y < horizon; y++) {
        const t = y / horizon;
        const f = t * (pal.sky.length - 1);
        const i = Math.min(pal.sky.length - 2, Math.floor(f));
        const col = lerpColor(pal.sky[i], pal.sky[i + 1], f - i);
        px(0, y, W, 1, col);
      }
      // солнце / луна (прячутся при погружении; сдвинуты от шапки и иконок)
      if (dive < 0.8) {
        if (weather === "sun" || weather === "clouds") {
          const sx = W - 108, sy = 26;
          px(sx, sy, 14, 14, pal.sun);
          const pulse = Math.floor(time * 2) % 2;
          const arm = (dx: number, dy: number, len: number) => {
            px(sx + 4 + dx - pulse, sy + 4 + dy - pulse, len, 2, pal.sun);
          };
          arm(-7, 0, 4); arm(17, 0, 4); arm(0, -7, 4); arm(0, 17, 4);
        } else {
          const mx = W - 102, my = 26;
          px(mx, my, 12, 12, pal.moon);
          px(mx + 6, my + 7, 5, 5, pal.moon);
          px(mx + 3, my + 4, 2, 2, weather === "storm" ? "#0E1428" : "#D8CCA8");
        }
        // звёзды (ночь)
        if (weather === "storm" || weather === "rain") {
          for (let i = 0; i < 14; i++) {
            const sxp = Math.floor(rnd(i + 50) * (W - 40));
            const syp = Math.floor(rnd(i + 100) * (horizon * 0.7));
            if (Math.floor(time * 2 + i) % 3 !== 0) px(sxp, syp, 1, 1, pal.star, 0.8);
          }
        }
        // облака — крупнее и детальнее (покачиваются)
        for (let i = 0; i < 4; i++) {
          const cx = ((time * (5 + i * 0.7) + i * 62) % (W + 60)) - 30;
          const cy = 12 + i * 14 + Math.floor(Math.sin(time * 0.5 + i * 1.4) * 1);
          if (cy < horizon * 0.65) {
            const cxx = Math.floor(cx);
            px(cxx, cy + 1, 14, 3, pal.cloud);
            px(cxx + 2, cy, 10, 1, pal.cloud);
            px(cxx + 4, cy - 1, 6, 1, pal.cloud);
            px(cxx + 1, cy + 4, 12, 2, pal.cloudDark);
            px(cxx + 5, cy + 3, 8, 1, pal.cloudDark);
            px(cxx + 1, cy + 6, 10, 1, pal.cloudDark, 0.5);
            if (i % 2 === 0) px(cxx + 9, cy + 5, 5, 1, pal.cloudDark);
          }
        }
        // дождь / молнии (скорость не зависит от горизонта)
        const maxSky = Math.round(H * SKY_FRAC);
        if (weather === "rain" || weather === "storm") {
          for (let i = 0; i < 40; i++) {
            const rx = rnd(i) * W;
            const ry = (time * (20 + (i % 4) * 4) + rnd(i + 300) * 120) % maxSky;
            if (ry < horizon) px(Math.floor(rx), Math.floor(ry), 1, 3, pal.rain, 0.8);
          }
        }
        if (weather === "storm" && Math.floor(time * 1.7) % 3 === 0) {
          const bx = 40 + Math.floor(rnd(Math.floor(time)) * 130);
          px(bx, 4, 1, 6, pal.bolt);
          px(bx - 2, 10, 4, 1, pal.bolt);
          px(bx - 1, 11, 1, 8, pal.bolt);
          px(bx - 3, 15, 3, 1, pal.bolt);
          px(bx - 2, 16, 1, 5, pal.bolt);
          px(bx + 1, 13, 1, 4, pal.bolt);
        }
        // чайки-«галочки» с машущими крыльями
        if ((weather === "sun" || weather === "clouds") && dive < 0.6) {
          for (let i = 0; i < 3; i++) {
            const gx = ((time * 12 + i * 90) % (W + 20)) - 10;
            const gy = 30 + i * 13 + Math.floor(Math.sin(time * 2 + i) * 2);
            if (gy < horizon - 8) {
              const flap = Math.floor(time * 7 + i * 2) % 2;
              if (flap) {
                px(Math.floor(gx), gy, 1, 1, pal.gull);
                px(Math.floor(gx) - 2, gy - 1, 2, 1, pal.gull);
                px(Math.floor(gx) + 1, gy - 1, 2, 1, pal.gull);
              } else {
                px(Math.floor(gx), gy, 1, 1, pal.gull);
                px(Math.floor(gx) - 2, gy + 1, 2, 1, pal.gull);
                px(Math.floor(gx) + 1, gy + 1, 2, 1, pal.gull);
              }
            }
          }
        }
        // дальняя скала на горизонте
        if (dive < 0.5) {
          const rx = 10 + Math.floor(Math.sin(time * 0.5) * 1);
          px(rx, horizon - 12, 2, 3, "#5A6E7E");
          px(rx - 2, horizon - 9, 6, 2, "#4E6272");
          px(rx - 4, horizon - 6, 10, 3, "#425464");
          px(rx - 6, horizon - 2, 14, 2, "#3A4A5A");
          px(rx + 3, horizon - 10, 1, 1, "#6E8292"); // блик
        }
        // парусник на горизонте
        if ((weather === "sun" || weather === "clouds") && dive < 0.55) {
          const sx = ((time * 4 + 30) % (W + 30)) - 15;
          const sway = Math.floor(Math.sin(time * 2) * 1);
          px(Math.floor(sx), horizon - 4 + sway, 3, 2, "#8A5A3A");
          px(Math.floor(sx) + 1, horizon - 8 + sway, 1, 4, "#3B5E70");
          px(Math.floor(sx) + 1, horizon - 7 + sway, 3, 3, "#F4F8F8");
        }
      }

      // ===== вода (horizon..H), плавный градиент к глубине =====
      for (let y = horizon; y < H; y++) {
        const t = (y - horizon) / (H - horizon);
        const f = t * (pal.water.length - 1);
        const wi = Math.min(pal.water.length - 2, Math.floor(f));
        const base = lerpColor(pal.water[wi], pal.water[wi + 1], f - wi);
        const col = lerpColor(base, DEEP[weather], Math.min(1, t * 0.9 + dive * 0.35));
        px(0, y, W, 1, col);
      }
      // волны-пена на горизонте
      for (let row = 0; row < 2; row++) {
        const baseY = horizon + row * 5;
        for (let x = 0; x < W; x += 3) {
          const waveY = baseY + Math.floor(Math.sin(x * 0.22 + time * (1.8 - row * 0.3)) * 1.5);
          if (Math.floor((x + time * 40) / 14) % 4 === 0) px(x, waveY, 2, 1, pal.foam);
        }
      }
      // блики
      if (weather === "sun" || weather === "clouds") {
        px(0, 0, 0, 0, pal.shine);
        for (let i = 0; i < 6; i++) {
          const bx = Math.floor(rnd(i + time * 1.3) * W);
          const by = horizon + 4 + Math.floor(rnd(i + 900) * 24);
          if (Math.floor(time * 3 + i) % 2 === 0) px(bx, by, 2, 1, pal.shine, 0.8);
        }
      }
      // световые столбы (покачиваются)
      if (weather === "sun" || weather === "clouds") {
        for (let i = 0; i < 5; i++) {
          const bx = 12 + i * 48 + Math.floor(Math.sin(time * 0.8 + i) * 4);
          const len = 34 + i * 6;
          px(bx, horizon + 4, 2, len, pal.shine, 0.1);
          px(bx + 8, horizon + 8, 2, len - 8, pal.shine, 0.07);
        }
      }
      // пузырьки (поднимаются)
      for (let i = 0; i < 16; i++) {
        const by = horizon + 40 + (H - horizon - 40 - ((time * 7 + rnd(i) * (H - horizon)) % (H - horizon - 20)));
        const bx = Math.floor(rnd(i + 700) * W);
        if (Math.floor(time * 4 + i) % 3 === 0) px(bx, Math.floor(by), 1, 1, "#FFFFFF", 0.35);
      }
      // дно: песок, камни, ракушки, растения, осьминог
      const sandCol = weather === "storm" ? "#050D18" : "#0A1E2C";
      const plantCol = weather === "storm" ? "#0C2A22" : weather === "rain" ? "#143A2E" : "#1E4A3A";
      px(0, H - 16, W, 16, sandCol);
      for (let i = 0; i < 40; i++) px(Math.floor(rnd(i + 800) * W), H - 16 + Math.floor(rnd(i + 900) * 12), 1, 1, "#12303F", 0.7);
      // камни
      for (let i = 0; i < 4; i++) {
        const kx = 10 + i * 62 + Math.floor(rnd(i + 30) * 14);
        px(kx, H - 13, 5, 4, "#16384A");
        px(kx + 1, H - 14, 3, 2, "#1E4458");
      }
      // ракушки
      for (let i = 0; i < 3; i++) {
        const sx2 = 26 + i * 85 + Math.floor(rnd(i + 10) * 12);
        px(sx2, H - 11, 4, 3, "#D8C8A8");
        px(sx2 + 1, H - 13, 2, 2, "#E8DCC0");
        px(sx2 - 1, H - 10, 2, 2, "#C8B898");
        px(sx2 + 2, H - 12, 1, 1, "#F0E8D0");
      }
      // растения (широкие, с листьями)
      for (let i = 0; i < 5; i++) {
        const bx = 8 + i * 48 + Math.floor(rnd(i + 40) * 20);
        const sway = Math.floor(Math.sin(time * 1.4 + i * 1.7) * 2);
        const hgt = 16 + Math.floor(rnd(i + 60) * 12);
        px(bx + sway, H - 16, 2, hgt, plantCol);
        px(bx + sway + 2, H - 14, 1, hgt - 5, plantCol);
        px(bx + sway - 1, H - 12, 1, hgt - 8, plantCol);
        if (i % 2 === 0) {
          px(bx + sway + 1, H - 12 - Math.floor(hgt * 0.5), 3, 1, plantCol);
          px(bx + sway - 2, H - 10 - Math.floor(hgt * 0.4), 2, 1, plantCol);
        }
      }
      // осьминог (ползёт по дну)
      const ocx = ((time * 3 + 40) % (W + 20)) - 10;
      const ocy = H - 15 + Math.floor(Math.sin(time * 2 + 3) * 1);
      const tent = Math.floor(time * 3) % 2;
      px(Math.floor(ocx), Math.floor(ocy), 6, 4, "#C87050");
      px(Math.floor(ocx) + 1, Math.floor(ocy) - 2, 4, 3, "#C87050");
      px(Math.floor(ocx) + 1, Math.floor(ocy) - 1, 2, 1, "#E8A080"); // блик
      px(Math.floor(ocx) + 1, Math.floor(ocy) + 1, 1, 1, "#1B1626");
      px(Math.floor(ocx) + 4, Math.floor(ocy) + 1, 1, 1, "#1B1626");
      px(Math.floor(ocx) - 1, Math.floor(ocy) + 3, 2, 1 + tent, "#A85538");
      px(Math.floor(ocx) + 2, Math.floor(ocy) + 3, 2, 2 - tent, "#A85538");
      px(Math.floor(ocx) + 5, Math.floor(ocy) + 3, 2, 1 + tent, "#A85538");

      // ===== подводный мир (в воде, глубже при dive) =====
      const waterTop = horizon + 8;
      // планктон (светящиеся точки, мерцают)
      for (let i = 0; i < 12; i++) {
        const pkx = Math.floor(rnd(i + 300) * W);
        const pky = waterTop + 10 + Math.floor(rnd(i + 400) * (H - waterTop - 30));
        if (Math.floor(time * 3 + i * 1.7) % 4 < 2) px(pkx, pky, 1, 1, "#E8FFF8", 0.5);
      }
      // медуза (пульсирует)
      if (weather === "sun" || weather === "clouds" || weather === "rain") {
        const mx2 = ((time * 5 + 60) % (W + 30)) - 15;
        const my2 = waterTop + 40 + Math.floor(Math.sin(time * 1.2) * 8);
        const pulse = Math.floor(Math.sin(time * 3)) > 0 ? 0 : 1;
        px(Math.floor(mx2), Math.floor(my2), 5, 3 - pulse, "#E8A0C8", 0.65);
        px(Math.floor(mx2) + 2, Math.floor(my2) - 1, 2, 1, "#F2C8E0", 0.65);
        px(Math.floor(mx2) + 1, Math.floor(my2) + 3 - pulse, 1, 4, "#E8A0C8", 0.45);
        px(Math.floor(mx2) + 4, Math.floor(my2) + 3 - pulse, 1, 5, "#E8A0C8", 0.45);
      }
      // стайка мелких рыбок
      if (weather === "sun" || weather === "clouds") {
        const sx0 = ((time * 12 + 20) % (W + 30)) - 15;
        const sy0 = waterTop + 55;
        for (let i = 0; i < 5; i++) {
          const fx = Math.floor(sx0 + i * 5 + Math.floor(Math.sin(time * 4 + i) * 2));
          const fy = Math.floor(sy0 + Math.sin(time * 3 + i * 1.3) * 4);
          px(fx, fy, 3, 2, i % 2 === 0 ? "#9AC8E0" : "#B8DCF0");
          px(fx + 3, fy + (Math.floor(time * 6 + i) % 2), 1, 1, "#9AC8E0");
          px(fx + 1, fy, 1, 1, "#1B1626");
        }
      }
      // краб на дне (бегает)
      const crabX = ((time * 7 + 90) % (W + 24)) - 12;
      const crabY = H - 19 + (Math.floor(time * 4) % 2 === 0 ? 0 : 1);
      const claw = Math.floor(time * 5) % 2;
      px(Math.floor(crabX), Math.floor(crabY), 5, 3, "#D06040");
      px(Math.floor(crabX) + 1, Math.floor(crabY) - 1, 3, 1, "#D06040");
      px(Math.floor(crabX) - 1, Math.floor(crabY) + claw, 2, 1, "#B04E30");
      px(Math.floor(crabX) + 5, Math.floor(crabY) + (1 - claw), 2, 1, "#B04E30");
      px(Math.floor(crabX) + 1, Math.floor(crabY) + 1, 1, 1, "#1B1626");
      px(Math.floor(crabX) + 3, Math.floor(crabY) + 1, 1, 1, "#1B1626");
      // морская звезда
      const starX = W - 42, starY = H - 13;
      px(starX, starY - 2, 1, 1, "#E8B060");
      px(starX + 1, starY - 1, 1, 1, "#E8B060");
      px(starX, starY, 1, 1, "#E8B060");
      px(starX + 2, starY, 1, 1, "#E8B060");
      px(starX + 4, starY, 1, 1, "#E8B060");
      px(starX + 2, starY + 1, 1, 1, "#E8B060");
      px(starX + 3, starY + 2, 1, 1, "#E8B060");
      px(starX + 1, starY + 1, 1, 1, "#F2C88A");

      // ===== подводный мир (в воде, глубже при dive) =====
      if (weather === "sun") {
        for (let i = 0; i < 4; i++) {
          const fx = ((time * (10 + i * 2) + i * 60) % (W + 12)) - 6;
          const fy = waterTop + Math.floor(rnd(i) * (H - waterTop - 30));
          fish(Math.floor(fx), Math.floor(fy), ["#FFB84D", "#FFD166", "#F29191", "#8AE0C0"][i], i % 2 === 1, time + i);
        }
        // дельфин (выпрыгивает, детальный)
        const dj = Math.max(0, Math.sin(time * 0.5)) * 10;
        const dx = ((time * 9 + 10) % (W + 24)) - 12;
        const dy = waterTop + 60 - dj;
        px(Math.floor(dx), Math.floor(dy), 9, 2, "#7C9AA8");
        px(Math.floor(dx) + 1, Math.floor(dy) - 1, 6, 1, "#7C9AA8");
        px(Math.floor(dx) + 3, Math.floor(dy) - 2, 2, 1, "#7C9AA8"); // спинной плавник
        px(Math.floor(dx) + 2, Math.floor(dy) + 2, 2, 1, "#7C9AA8"); // брюшной
        px(Math.floor(dx) - 1, Math.floor(dy) + 1, 1, 1, "#7C9AA8");
        px(Math.floor(dx) - 1, Math.floor(dy) + 2, 1, 1, "#7C9AA8");
        px(Math.floor(dx) + 8, Math.floor(dy), 1, 1, "#1B1626"); // глаз
        px(Math.floor(dx) + 8, Math.floor(dy) + 1, 2, 1, "#B8CCD8"); // нос
        px(Math.floor(dx) + 3, Math.floor(dy), 2, 1, "#A8BCC8", 0.5); // блик
        if (dj > 3) {
          px(Math.floor(dx) + 3, Math.floor(dy) + 3, 2, 1, "#EAF7F7", 0.8);
          px(Math.floor(dx) + 6, Math.floor(dy) + 4, 1, 1, "#EAF7F7", 0.8);
        }
        const st = ((time * 6 + 150) % (W + 24)) - 12;
        const sy = waterTop + 110;
        const wing = Math.floor(time * 4) % 2 === 0 ? 0 : 1;
        px(Math.floor(st), Math.floor(sy), 4, 1, "#4A5A68");
        px(Math.floor(st) - 3, Math.floor(sy) + wing, 3, 1, "#4A5A68");
        px(Math.floor(st) + 4, Math.floor(sy) + (1 - wing), 3, 1, "#4A5A68");
        px(Math.floor(st) + 1, Math.floor(sy) + 1, 1, 1, "#4A5A68");
      } else if (weather === "clouds") {
        for (let i = 0; i < 3; i++) {
          const fx = ((time * (8 + i * 2) + i * 80) % (W + 12)) - 6;
          const fy = waterTop + Math.floor(rnd(i + 2) * (H - waterTop - 40));
          fish(Math.floor(fx), Math.floor(fy), ["#D8C060", "#B0A0C0", "#7CA3B8"][i], i % 2 === 1, time + i);
        }
        const st = ((time * 5 + 120) % (W + 24)) - 12;
        const sy = waterTop + 90;
        const wing = Math.floor(time * 3.5) % 2 === 0 ? 0 : 1;
        px(Math.floor(st), Math.floor(sy), 4, 1, "#3E4E5C");
        px(Math.floor(st) - 3, Math.floor(sy) + wing, 3, 1, "#3E4E5C");
        px(Math.floor(st) + 4, Math.floor(sy) + (1 - wing), 3, 1, "#3E4E5C");
      } else if (weather === "rain") {
        for (let i = 0; i < 2; i++) {
          const ax = ((time * (13 + i * 3) + i * 100) % (W + 16)) - 8;
          const ay = waterTop + 30 + i * 55;
          px(Math.floor(ax), Math.floor(ay), 8, 2, "#6E7B88");
          px(Math.floor(ax) + 2, Math.floor(ay) - 1, 2, 1, "#4A5560");
          px(Math.floor(ax) - 1, Math.floor(ay) + (Math.floor(time * 5 + i) % 2), 1, 2, "#6E7B88");
          px(Math.floor(ax) + 7, Math.floor(ay), 1, 1, "#1B1626");
          px(Math.floor(ax) + 8, Math.floor(ay) + 1, 1, 1, "#1B1626");
        }
        const fx = ((time * 7 + 40) % (W + 12)) - 6;
        fish(Math.floor(fx), waterTop + 75, "#9AB0BC", false, time);
      } else {
        // storm: мигающие красные глаза в тёмной воде
        for (let i = 0; i < 4; i++) {
          const gx = 12 + Math.floor(rnd(i + 50) * (W - 30));
          const gy = waterTop + 20 + Math.floor(rnd(i + 80) * (H - waterTop - 70));
          const on = Math.sin(time * (2.2 + i * 0.4) + i * 2.1) > -0.35;
          if (on) {
            px(gx, gy, 9, 5, "#FF004D", 0.14); // ореол
            px(gx + 1, gy + 1, 2, 2, "#FF004D");
            px(gx + 6, gy + 1, 2, 2, "#FF004D");
          }
        }
      }

      // ===== передний план: крупные объекты поверх всего =====
      if (weather === "sun") {
        // крупная рыба (ближняя)
        const fx = ((time * 16 + 30) % (W + 24)) - 12;
        const fy = H - 34 + Math.floor(Math.sin(time * 3) * 3);
        px(Math.floor(fx), Math.floor(fy), 8, 4, "#FF9F3C");
        px(Math.floor(fx) + 8, Math.floor(fy) + 1, 2, 4, "#FF9F3C");
        px(Math.floor(fx) + 3, Math.floor(fy) - 2, 2, 1, "#FF9F3C");
        px(Math.floor(fx) + 1, Math.floor(fy), 2, 2, "#1B1626");
        px(Math.floor(fx) + 9, Math.floor(fy) + (Math.floor(time * 5) % 2), 2, 1, "#FF9F3C");
      } else if (weather === "rain") {
        // ближняя акула (крупная, тёмный силуэт снизу)
        const ax = ((time * 18 + 10) % (W + 30)) - 15;
        const ay = H - 30;
        px(Math.floor(ax), Math.floor(ay), 12, 4, "#4E5A66");
        px(Math.floor(ax) + 3, Math.floor(ay) - 3, 3, 2, "#3A4550");
        px(Math.floor(ax) - 2, Math.floor(ay) + 2, 2, 3, "#4E5A66");
        px(Math.floor(ax) + 2, Math.floor(ay), 2, 2, "#0A0F14");
      } else if (weather === "storm") {
        // ближние красные глаза (крупные, поверх)
        const on = Math.sin(time * 3.1) > -0.25;
        if (on) {
          const gx = 40, gy = H - 52;
          px(gx - 2, gy - 2, 14, 8, "#FF004D", 0.16);
          px(gx, gy, 4, 4, "#FF004D");
          px(gx + 10, gy, 4, 4, "#FF004D");
        }
        const on2 = Math.sin(time * 2.4 + 1.5) > -0.25;
        if (on2) {
          const gx2 = W - 70, gy2 = H - 40;
          px(gx2 - 2, gy2 - 2, 14, 8, "#FF004D", 0.16);
          px(gx2, gy2, 4, 4, "#FF004D");
          px(gx2 + 10, gy2, 4, 4, "#FF004D");
        }
      }
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [weather]);

  return (
    <canvas
      ref={ref}
      width={W * S}
      height={H * S}
      className="fixed inset-0 z-0 w-full h-full pointer-events-none"
      style={{ imageRendering: "pixelated", background: "#141A2E" }}
      aria-hidden
    />
  );
}
