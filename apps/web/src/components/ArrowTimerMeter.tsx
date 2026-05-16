"use client";

import type { GameSettings } from "@/hooks/useSettings";

type Props = {
  elapsed: number;
  settings: GameSettings;
  active: boolean;
};

type Threshold = {
  seconds: number;
  label: string;
  color: string;
  activeColor: string;
};

export function ArrowTimerMeter({ elapsed, settings, active }: Props) {
  const thresholds: Threshold[] = [
    {
      seconds: settings.arrowDelay3rd,
      label: "3位",
      color: "bg-amber-900/50",
      activeColor: "bg-amber-700",
    },
    {
      seconds: settings.arrowDelay2nd,
      label: "2位",
      color: "bg-zinc-500/50",
      activeColor: "bg-zinc-300",
    },
    {
      seconds: settings.arrowDelay1st,
      label: "1位",
      color: "bg-yellow-800/50",
      activeColor: "bg-yellow-500",
    },
  ].sort((a, b) => a.seconds - b.seconds);

  const maxSeconds = Math.max(...thresholds.map((t) => t.seconds));
  if (maxSeconds <= 0) return null;

  const displayMax = maxSeconds * 1.08;
  const progress = active ? Math.min(elapsed / displayMax, 1) : 0;

  return (
    <div className="w-full max-w-md mt-2">
      <div className="relative h-5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-900/60 via-amber-700/50 to-amber-500/40 transition-[width] duration-100 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
        {thresholds.map((t) => {
          const pos = (t.seconds / displayMax) * 100;
          const reached = active && elapsed >= t.seconds;
          return (
            <div key={t.label} className="absolute inset-y-0" style={{ left: `${pos}%` }}>
              <div
                className={`absolute inset-y-0 w-0.5 ${reached ? t.activeColor : t.color} transition-colors duration-300`}
              />
              <div
                className={`absolute -top-0.5 -translate-x-1/2 left-0 text-[10px] font-bold leading-none px-1 rounded ${
                  reached ? "text-white" : "text-zinc-500"
                } transition-colors duration-300`}
              >
                {t.label}
              </div>
            </div>
          );
        })}
      </div>
      {active && (
        <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5 px-1">
          <span>{Math.floor(elapsed)}秒</span>
          <span>{maxSeconds}秒</span>
        </div>
      )}
    </div>
  );
}
