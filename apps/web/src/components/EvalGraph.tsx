"use client";

type Props = {
  evalHistory: (number | null)[];
  currentIndex: number;
  onClickMove?: (index: number) => void;
  width?: number;
  compact?: boolean;
};

const W = 400;
const H = 100;
const MAX_CP = 2000;
const PAD = 4;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function cpToY(cp: number | null): number {
  const c = clamp(cp ?? 0, -MAX_CP, MAX_CP);
  return H / 2 - (c / MAX_CP) * (H / 2 - PAD);
}

export function EvalGraph({ evalHistory, currentIndex, onClickMove, width: containerWidth, compact = false }: Props) {
  if (evalHistory.length < 2) return null;

  const points = evalHistory.map((cp, i) => ({
    x: (i / (evalHistory.length - 1)) * W,
    y: cpToY(cp),
  }));

  const lineD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
    .join(" ");

  const areaD = `M0 ${H / 2} ${points.map((p) => `L${p.x} ${p.y}`).join(" ")} L${W} ${H / 2}Z`;

  const cur = points[currentIndex];

  return (
    <div className={`${compact ? "mt-0.5" : "mt-2"} px-1`} style={{ width: containerWidth ?? 460, maxWidth: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full ${compact ? "h-10" : "h-20"} rounded-lg bg-zinc-800/60`}
        preserveAspectRatio="none"
      >
        <line
          x1={0}
          y1={H / 2}
          x2={W}
          y2={H / 2}
          stroke="#555"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
        <path d={areaD} fill="rgba(212,175,55,0.12)" />
        <path
          d={lineD}
          fill="none"
          stroke="#d4af37"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {cur && (
          <circle
            cx={cur.x}
            cy={cur.y}
            r={4}
            fill="#d4af37"
            stroke="#fff"
            strokeWidth={1.5}
          />
        )}
        {onClickMove &&
          points.map((_, i) => (
            <rect
              key={i}
              x={Math.max(
                0,
                points[i].x - W / (2 * Math.max(points.length, 1)),
              )}
              y={0}
              width={W / Math.max(points.length, 1)}
              height={H}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => onClickMove(i)}
            />
          ))}
      </svg>
    </div>
  );
}
