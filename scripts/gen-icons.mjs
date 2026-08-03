// Генерация PWA-иконок: пиксельное сердце 12×12 на тёмно-морском фоне.
// 0 = фон, 1 = основной, L = светлый (блик), D = тёмный (тень)
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const HEART = [
  "011000000110",
  "111100111111",
  "111111111111",
  "111111111111",
  "011111111110",
  "011111111110",
  "001111111100",
  "001111111100",
  "000111111000",
  "000011110000",
  "000001100000",
];

const COLORS = {
  "0": [30, 42, 58, 255], // фон-«океан» #1E2A3A
  "1": [255, 123, 107, 255], // сердце #FF7B6B
  L: [255, 201, 190, 255], // блик #FFC9BE
  D: [201, 79, 69, 255], // тень #C94F45
};

mkdirSync("public/icons", { recursive: true });

for (const size of [192, 512]) {
  // сетка 16×16, сердце 12×12 с полями — поменьше, с «воздухом»
  const scale = Math.floor(size / 16);
  const offset = Math.floor((size - 12 * scale) / 2);
  const buf = Buffer.alloc(size * size * 4);
  // фон
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = COLORS["0"][0];
    buf[i * 4 + 1] = COLORS["0"][1];
    buf[i * 4 + 2] = COLORS["0"][2];
    buf[i * 4 + 3] = 255;
  }
  // сердце
  HEART.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === "0") continue;
      const c = COLORS[ch];
      for (let py = 0; py < scale; py++) {
        for (let px2 = 0; px2 < scale; px2++) {
          const i = ((offset + y * scale + py) * size + (offset + x * scale + px2)) * 4;
          buf[i] = c[0];
          buf[i + 1] = c[1];
          buf[i + 2] = c[2];
          buf[i + 3] = 255;
        }
      }
    }
  });

  await sharp(buf, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  console.log(`icon-${size}.png ✓ (pixel heart on ocean)`);
}
