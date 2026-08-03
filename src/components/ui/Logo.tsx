// Пиксельный логотип: два сердца «в объятиях» + ретро-шрифт + мигающий курсор.

// Пиксельная форма сердца 7×6 (отдельные «пиксели»)
const HEART_ROWS = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];

function PixelHeart({
  x,
  y,
  tilt,
  color,
}: {
  x: number;
  y: number;
  tilt: number; // наклон в градусах («объятия»)
  color: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt} 3.5 3)`}>
      {HEART_ROWS.map((row, ry) =>
        row.split("").map((c, rx) =>
          c === "X" ? (
            <rect key={`${ry}-${rx}`} x={rx} y={ry} width={1.04} height={1.04} fill={color} />
          ) : null
        )
      )}
    </g>
  );
}

// Два пиксельных сердца, наклонённых друг к другу — «вместе»
function PixelHearts({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ imageRendering: "pixelated" }}
      aria-hidden
    >
      <PixelHeart x={2.2} y={8.2} tilt={-16} color="#ffffff" />
      <PixelHeart x={12.8} y={8.2} tilt={16} color="#ffffff" />
      {/* тёплый блик на правом сердце */}
      <rect x={15.6} y={9.6} width={1} height={1} fill="#FFD9D4" opacity={0.9} />
    </svg>
  );
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className="rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_6px_20px_rgba(232,131,127,.4)]"
        style={{ width: size, height: size }}
      >
        <PixelHearts size={size * 0.62} />
      </div>
      <span className="font-pixel text-ink flex items-center gap-1.5" style={{ fontSize: size * 0.52 }}>
        caremode
        <span className="pixel-cursor" />
      </span>
    </div>
  );
}
