import { Heart } from "lucide-react";

// Пиксельный логотип: ретро-шрифт + мигающий курсор-блок.
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className="rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_6px_20px_rgba(232,131,127,.4)]"
        style={{ width: size, height: size }}
      >
        <Heart size={size * 0.5} className="text-white" fill="currentColor" />
      </div>
      <span className="font-pixel text-ink flex items-center gap-1.5" style={{ fontSize: size * 0.52 }}>
        caremode<span className="text-primary">.</span>
        <span className="pixel-cursor" />
      </span>
    </div>
  );
}
