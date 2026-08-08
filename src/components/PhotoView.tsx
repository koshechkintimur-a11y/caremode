"use client";

import { useState } from "react";
import { Expand } from "lucide-react";

// Фото с превью и раскрытием на весь экран (dataURL от партнёра).
export function PhotoView({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [full, setFull] = useState(false);

  return (
    <>
      <div className={className ?? "relative"}>
        <img
          src={src}
          alt={alt}
          className="w-full h-[140px] object-cover rounded-2xl border border-line"
        />
        <button
          onClick={() => setFull(true)}
          aria-label="Открыть фото полностью"
          className="absolute right-2 top-2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition"
        >
          <Expand size={16} />
        </button>
      </div>

      {full && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFull(false)}
        >
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full object-contain rounded-2xl"
          />
          <button
            onClick={() => setFull(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center active:scale-90 transition"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
