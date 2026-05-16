"use client";

import { useEffect, useState } from "react";

type Props = {
  file: number;
  rank: number;
  flipped: boolean;
  trigger: number;
  cellSize?: number;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
};

const COLORS = ["#FFD700", "#FF8C00", "#FF4500", "#FFFFFF", "#FFA500"];

export function CaptureEffect({ file, rank, flipped, trigger, cellSize = 48 }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flash, setFlash] = useState(false);

  const boardPx = cellSize * 9;

  useEffect(() => {
    if (trigger === 0) return;

    const col = flipped ? file - 1 : 9 - file;
    const row = flipped ? 9 - rank : rank - 1;
    const cx = col * cellSize + cellSize / 2;
    const cy = row * cellSize + cellSize / 2;

    const speedScale = cellSize / 48;
    const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
      const speed = (80 + Math.random() * 120) * speedScale;
      return {
        id: Date.now() + i,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (3 + Math.random() * 4) * speedScale,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 1,
      };
    });

    setParticles(newParticles);
    setFlash(true);
    setTimeout(() => setFlash(false), 120);

    const start = performance.now();
    let raf: number;
    const animate = (now: number) => {
      const dt = Math.min((now - start) / 1000, 1);
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            life: Math.max(0, 1 - dt / 0.5),
          }))
          .filter((p) => p.life > 0),
      );
      if (dt < 0.5) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(raf);
  }, [trigger, file, rank, flipped, cellSize]);

  if (particles.length === 0 && !flash) return null;

  return (
    <>
      {flash && (
        <div className="absolute inset-0 bg-white/20 pointer-events-none z-30 animate-[flash_0.12s_ease-out]" />
      )}
      <svg
        className="absolute inset-0 pointer-events-none z-20"
        viewBox={`0 0 ${boardPx} ${boardPx}`}
        width={boardPx}
        height={boardPx}
      >
        {particles.map((p) => {
          const elapsed = 1 - p.life;
          const px = p.x + p.vx * elapsed;
          const py = p.y + p.vy * elapsed;
          return (
            <circle
              key={p.id}
              cx={px}
              cy={py}
              r={p.size * p.life}
              fill={p.color}
              opacity={p.life * 0.9}
            />
          );
        })}
      </svg>
    </>
  );
}
