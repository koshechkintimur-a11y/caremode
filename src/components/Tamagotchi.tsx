"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Пиксельный маскот v3: пышное облако + кошачьи ушки + мордочка.
// Эмоции (её состояние): happy/sad/spiky/neutral — цвет, мимика, эффекты.
// ЭВОЛЮЦИЯ (как покемоны): 3 стадии по GOOD-поступкам:
//   baby  (0-4)   — маленький пушистик
//   teen  (5-14)  — с бантиком
//   adult (15+)   — крупный, с короной и усиленными эффектами
// БАБЛ-ДИАЛОГИ: при тапе и при событиях маскот «говорит» фразу по состоянию.
// Тап = сердечки (без XP). GOOD = всплеск + фраза роста.

export type TamagotchiState = "neutral" | "happy" | "sad" | "spiky";
export type PetStage = "baby" | "teen" | "adult";

export function stageOf(goodCount: number): PetStage {
  return goodCount >= 15 ? "adult" : goodCount >= 5 ? "teen" : "baby";
}

const STAGE_LABEL: Record<PetStage, string> = {
  baby: "детёныш",
  teen: "подросток",
  adult: "взрослый",
};

export { STAGE_LABEL };

const LABELS: Record<TamagotchiState, string> = {
  happy: "ей хорошо",
  neutral: "спокойный день",
  sad: "ей тяжело",
  spiky: "ей нужна тишина",
};

// Бабл-фразы по состояниям (ротация случайная)
const PHRASES: Record<TamagotchiState, string[]> = {
  happy: [
    "она в порядке 🙂",
    "ей хорошо — и ты при делах",
    "она улыбается. продолжай",
    "отличный день, чтобы быть рядом",
  ],
  sad: [
    "ей нужно тепло… обними её",
    "она устала. будь мягче",
    "ей грустно — просто побудь рядом",
    "не спрашивай, просто обними",
  ],
  spiky: [
    "я колючий! не трогай 😤",
    "ей нужно пространство",
    "тише… она злится",
    "не приставай, но будь рядом",
  ],
  neutral: [
    "спокойно… жду её отметку",
    "она ещё ничего не отметила",
    "пока всё тихо",
    "наберись терпения, скоро оживёт",
  ],
};

const GOOD_PHRASES = [
  "+1 забота! Я расту 🌱",
  "ещё один GOOD — почти эволюция!",
  "она заметила. продолжай в том же духе",
];

const PAL: Record<TamagotchiState, { body: string; dark: string; light: string }> = {
  happy: { body: "#E5D93C", dark: "#A89B28", light: "#F5EC7A" }, // жёлтый, чуть зеленоватый
  neutral: { body: "#5EA8C8", dark: "#2E6E7E", light: "#9FD3E8" },
  sad: { body: "#5B8FBF", dark: "#3A5F8A", light: "#9FB8DC" },
  spiky: { body: "#E05C5C", dark: "#A63C3C", light: "#F29191" },
};

const S = 4;
const GW = 44; // шире: боковые тучки не обрезаются
const GH = 40; // выше: запас под передними тучками (не достают до воды)

// размеры форм: полуширина облака, сдвиг по Y, (уши/макушки считаются от неё)
const SIZES: Record<PetStage, { bw: number; baseY: number }> = {
  baby: { bw: 5, baseY: 2 },
  teen: { bw: 8, baseY: 0 },
  adult: { bw: 11, baseY: 0 }, // baseY=0: корона (y=1) не выходит за верх канваса
};

function PixelCloudPet({ state, stage }: { state: TamagotchiState; stage: PetStage }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const { bw, baseY } = SIZES[stage];

    const px = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x * S, y * S, w * S, h * S);
    };

    // тучка-облачко (комки, не «пар»)
    const cloudlet = (x: number, y: number, top: string, bottom: string) => {
      px(x + 1, y, 3, 1, top); // верхний комок
      px(x + 2, y - 1, 3, 1, top);
      px(x, y + 1, 4, 1, top);
      px(x + 3, y + 1, 3, 1, top);
      px(x + 5, y, 2, 1, top);
      px(x + 6, y - 1, 2, 1, top);
      px(x, y + 2, 8, 2, bottom); // плоское основание
      px(x + 1, y + 4, 6, 1, bottom);
    };

    const draw = (t: number) => {
      const time = t / 1000;
      ctx.clearRect(0, 0, GW * S, GH * S);
      ctx.save();
      ctx.translate(0, 5); // запас сверху: корона и уши не у края
      const pal = PAL[state];

      let oy = 0;
      let ox = 0;
      if (state === "happy") oy = -Math.abs(Math.sin(time * 2.6)) * 3;
      if (state === "sad") oy = Math.sin(time * 1.4) > 0 ? -1 : 0;
      if (state === "spiky") ox = Math.floor(time * 4.5) % 2 === 0 ? 1 : -1;
      if (state === "neutral") oy = Math.sin(time * 1.8) > 0 ? -1 : 0;

      const spikySad = state === "spiky" && time % 4 > 3.2;
      const sadMode = state === "sad" || spikySad;

      // ==== задние тучки (плывут слева направо, в границах канваса) ====
      const drift = (phase: number) => ((time * 9 + phase) % (GW - 6)) - 2;
      if (state === "sad") {
        const x = drift(0);
        cloudlet(Math.round(x) + 6, 3, "#8FA3B8", "#7C92A8");
        if (stage === "adult") cloudlet(Math.round(drift(60)) + 4, 5, "#8FA3B8", "#7C92A8");
      } else if (state === "spiky") {
        const x = drift(30);
        cloudlet(Math.round(x) + 8, 2, "#59647A", "#4A5468");
        if (stage === "adult") cloudlet(Math.round(drift(90)) + 2, 4, "#59647A", "#4A5468");
      } else {
        const x = drift(15);
        cloudlet(Math.round(x) + 4, 3, "#F4FAFF", "#E7F1FA");
        if (stage === "adult") cloudlet(Math.round(drift(55)) + 2, 5, "#F4FAFF", "#E7F1FA");
      }

      // ==== маскот ====
      const mx = 22 + ox;
      const earDrop = sadMode ? 1 : 0;

      // ушки-треугольники (позиция зависит от ширины облака)
      px(mx - bw + 4, 3 + earDrop + oy, 2, 1, pal.body);
      px(mx - bw + 3, 4 + earDrop + oy, 4, 2, pal.body);
      px(mx - bw + 4, 4 + earDrop + oy, 1, 1, "#F0A08C");
      px(mx + bw - 4, 3 + earDrop + oy, 2, 1, pal.body);
      px(mx + bw - 5, 4 + earDrop + oy, 4, 2, pal.body);
      px(mx + bw - 3, 4 + earDrop + oy, 1, 1, "#F0A08C");

      // пышное облако
      if (sadMode) {
        // сжатое: заворачивается в облако (чуть шире у взрослого)
        const w = bw - 1;
        px(mx - w + 1, 6 + oy, w * 2 - 2, 3, pal.body);
        px(mx - w - 1, 8 + oy, w * 2 + 2, 3, pal.body);
        px(mx - w, 11 + oy, w * 2, 2, pal.light);
        px(mx - w - 2, 12 + oy, w * 2 + 4, 2, pal.light);
        px(mx - w - 1, 14 + oy, w * 2 + 2, 1, pal.dark);
      } else {
        // макушки
        px(mx - bw + 2, 7 + baseY + oy, 3, 2, pal.light);
        px(mx - 2, 6 + baseY + oy, 4, 2, pal.body);
        px(mx + bw - 3, 7 + baseY + oy, 3, 2, pal.light);
        // соединитель и основание
        px(mx - bw + 1, 9 + baseY + oy, bw * 2 - 2, 2, pal.body);
        px(mx - bw - 1, 11 + baseY + oy, bw * 2 + 2, 2, pal.body);
        px(mx - bw - 2, 13 + baseY + oy, bw * 2 + 4, 2, pal.light);
        px(mx - bw - 1, 15 + baseY + oy, bw * 2 + 2, 2, pal.light);
        px(mx - bw, 17 + baseY + oy, bw * 2, 1, pal.dark);
      }

      // ==== аксессуары стадии ====
      if (stage === "teen") {
        // бантик на макушке справа
        px(mx + 3, 3 + baseY + oy, 2, 1, "#F29191");
        px(mx + 2, 4 + baseY + oy, 4, 2, "#F29191");
        px(mx + 3, 4 + baseY + oy, 2, 1, "#fff");
      } else if (stage === "adult") {
        // корона-звёздочка
        px(mx + 2, 2 + baseY + oy, 1, 2, "#F2C94C");
        px(mx + 4, 1 + baseY + oy, 1, 2, "#F2C94C");
        px(mx + 6, 2 + baseY + oy, 1, 2, "#F2C94C");
        px(mx + 2, 3 + baseY + oy, 5, 1, "#F2C94C");
        px(mx + 3, 4 + baseY + oy, 3, 1, "#E8B060");
      }

      // ==== мордочка ====
      if (state === "happy") {
        const blink = time % 2.4 < 0.22;
        px(mx - 5, 10 + oy, 2, 2, "#1B1626");
        px(mx - 5, 10 + oy, 1, 1, "#fff");
        if (blink) {
          px(mx + 3, 11 + oy, 2, 1, "#1B1626");
          px(mx + 6, 9 + oy, 1, 1, "#FFEC27"); // искорка при подмигивании
        } else {
          px(mx + 3, 10 + oy, 2, 2, "#1B1626");
          px(mx + 4, 10 + oy, 1, 1, "#fff");
        }
        px(mx - 4, 13 + oy, 1, 1, pal.dark);
        px(mx - 3, 14 + oy, 3, 1, pal.dark);
        px(mx, 13 + oy, 1, 1, pal.dark);
        // взрослый счастливый: искры вокруг при прыжке
        if (stage === "adult" && Math.floor(time * 3) % 2 === 0) {
          px(mx - 9, 6 + oy, 1, 1, "#FFEC27");
          px(mx + 8, 4 + oy, 1, 1, "#FFEC27");
        }
      } else if (sadMode) {
        px(mx - 5, 11 + oy, 2, 1, "#1B1626");
        px(mx + 3, 11 + oy, 2, 1, "#1B1626");
        px(mx - 5, 12 + oy, 1, 1, "#9FD8F0");
        px(mx + 3, 12 + oy, 1, 1, "#9FD8F0");
        px(mx - 3, 13 + oy, 4, 1, pal.dark);
        px(mx - 2, 12 + oy, 1, 1, pal.dark);
        px(mx + 1, 12 + oy, 1, 1, pal.dark);
      } else if (state === "spiky") {
        px(mx - 6, 10 + oy, 2, 2, "#1B1626");
        px(mx + 4, 10 + oy, 2, 2, "#1B1626");
        px(mx - 7, 9 + oy, 3, 1, pal.dark);
        px(mx + 5, 9 + oy, 3, 1, pal.dark);
        px(mx - 1, 7 + oy, 1, 1, pal.dark);
        px(mx + 1, 7 + oy, 1, 1, pal.dark);
        px(mx - 3, 13 + oy, 3, 2, "#1B1626");
        const hiss = Math.floor(time * 8) % 2 === 0;
        if (hiss) {
          px(mx - 4, 12 + oy, 1, 1, "#fff");
          px(mx + 2, 12 + oy, 1, 1, "#fff");
        }
        // взрослый злой: пар из ушей
        if (stage === "adult" && hiss) {
          px(mx - 7, 2 + oy, 1, 1, "#fff");
          px(mx + 7, 2 + oy, 1, 1, "#fff");
        }
      } else {
        px(mx - 5, 10 + oy, 2, 2, "#1B1626");
        px(mx + 3, 10 + oy, 2, 2, "#1B1626");
        px(mx - 3, 13 + oy, 4, 1, pal.dark);
      }

      // щёки
      if (state === "happy" || state === "neutral") {
        px(mx - 7, 12 + oy, 1, 1, "#F0A08C");
        px(mx + 6, 12 + oy, 1, 1, "#F0A08C");
      }

      // ==== передние тучки (подняты к маскоту, не достают до воды) ====
      const nClouds = stage === "adult" ? 3 : stage === "teen" ? 2 : 1;
      if (state === "sad") {
        for (let i = 0; i < nClouds; i++) {
          const x1 = Math.round(drift(45 + i * 75));
          cloudlet(x1 + 2 + i * 10, 14 + i * 2, "#8FA3B8", "#7C92A8");
          if (Math.floor(time * 6) % 2 === 0) {
            px(x1 + 4, 17 + i * 2, 1, 2, "#6E87A3");
            px(x1 + 6, 18 + i * 2, 1, 2, "#6E87A3");
          }
        }
      } else if (state === "spiky") {
        for (let i = 0; i < nClouds; i++) {
          const x1 = Math.round(drift(70 + i * 80));
          cloudlet(x1 + 2 + i * 12, 14 + i * 2, "#59647A", "#4A5468");
          if (Math.floor(time * 5) % 3 !== 0) {
            px(x1 + 3, 16 + i * 2, 1, 2, "#FFEC27");
            px(x1 + 4, 18 + i * 2, 2, 1, "#FFEC27");
            px(x1 + 3, 19 + i * 2, 1, 2, "#FFEC27");
          }
        }
      } else {
        for (let i = 0; i < nClouds; i++) {
          const x1 = Math.round(drift(95 + i * 75));
          cloudlet(x1 + 4 + i * 10, 13 + i * 3, "#F4FAFF", "#E7F1FA");
        }
      }
      ctx.restore();
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state, stage]);

  return (
    <canvas
      ref={ref}
      width={GW * S}
      height={GH * S}
      className="block"
      style={{ imageRendering: "pixelated", width: 425, height: 386, maxWidth: "100%" }}
      aria-label={`Питомец (${STAGE_LABEL[stage]}): ${LABELS[state]}`}
    />
  );
}

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function Tamagotchi({
  state,
  goodCount,
  day = null,
}: {
  state: TamagotchiState;
  goodCount: number;
  day?: number | null;
}) {
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const [bubble, setBubble] = useState<string | null>(null);
  const idRef = useRef(0);
  const lastGood = useRef(goodCount);
  const prevState = useRef(state);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stage = stageOf(goodCount);

  function say(text: string) {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubble(text);
    bubbleTimer.current = setTimeout(() => setBubble(null), 2600);
  }

  function burst(n: number) {
    const b = Array.from({ length: n }, () => ({ id: idRef.current++, x: 28 + Math.random() * 44 }));
    setHearts((h) => [...h, ...b]);
    setTimeout(() => setHearts((h) => h.filter((p) => !b.includes(p))), 1050);
  }

  // GOOD вырос → всплеск + фраза роста
  useEffect(() => {
    if (goodCount > lastGood.current) {
      lastGood.current = goodCount;
      burst(6);
      const t = setTimeout(() => say(pick(GOOD_PHRASES)), 400);
      return () => clearTimeout(t);
    }
  }, [goodCount]);

  // смена состояния → маскот «комментирует» (не при первом показе)
  useEffect(() => {
    if (state !== prevState.current) {
      prevState.current = state;
      const t = setTimeout(() => say(pick(PHRASES[state])), 500);
      return () => clearTimeout(t);
    }
  }, [state]);

  function pet() {
    burst(5);
    say(pick(PHRASES[state]));
  }

  return (
    <div className="w-full relative">
      <div className="relative flex flex-col items-center mt-[107px] pb-1">
        <motion.button
          onClick={pet}
          whileTap={{ scale: 0.94 }}
          className="relative cursor-pointer active:scale-95 transition-transform"
          aria-label={`Питомец: ${LABELS[state]}`}
        >
          {/* бабл-диалог */}
          <AnimatePresence>
            {bubble && (
              <motion.div
                key={bubble}
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1B1626]/95 px-4 py-2 text-[12px] font-extrabold text-white shadow-[0_8px_24px_rgba(0,0,0,.3)] border border-white/20 z-20"
              >
                {bubble}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#1B1626]/95 border-b border-r border-white/20" />
              </motion.div>
            )}
          </AnimatePresence>

          <PixelCloudPet state={state} stage={stage} />
          <AnimatePresence>
            {hearts.map((h) => (
              <motion.span
                key={h.id}
                initial={{ opacity: 1, y: 10, scale: 0.6 }}
                animate={{ opacity: 0, y: -34, scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute bottom-6 text-[20px] pointer-events-none"
                style={{ left: `${h.x}%` }}
              >
                💛
              </motion.span>
            ))}
          </AnimatePresence>
        </motion.button>
        <div className="relative mt-1 px-3 py-1 rounded-full text-[11px] font-pixel text-[#5F574F] bg-white/75">
          {LABELS[state]}
          {day ? ` · день ${day}` : ""}
        </div>
      </div>
    </div>
  );
}
