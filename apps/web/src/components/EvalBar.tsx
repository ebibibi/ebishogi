"use client";

const MAX_CP = 2000;

function isMate(cp: number): boolean {
  return Math.abs(cp) > 29000;
}

function formatEval(cp: number): string {
  if (isMate(cp)) {
    const mate = cp > 0 ? 30000 - cp : -30000 - cp;
    return `#${Math.abs(mate)}`;
  }
  const sign = cp > 0 ? "+" : "";
  return `${sign}${cp}`;
}

function evalToPercent(cp: number): number {
  if (isMate(cp)) return cp > 0 ? 96 : 4;
  const clamped = Math.max(-MAX_CP, Math.min(MAX_CP, cp));
  return 50 + (clamped / MAX_CP) * 46;
}

type Props = {
  eval_cp: number | null;
};

export function EvalBar({ eval_cp }: Props) {
  const sentePercent = eval_cp !== null ? evalToPercent(eval_cp) : 50;
  const displayValue = eval_cp !== null ? formatEval(eval_cp) : "—";
  const isSenteAdvantage = (eval_cp ?? 0) >= 0;

  return (
    <div className="flex flex-col items-center gap-1 select-none" data-testid="eval-bar">
      <span className="text-xs text-zinc-500">☖後手</span>
      <div className="relative w-7 rounded-sm overflow-hidden" style={{ height: 432 }}>
        <div className="absolute inset-0 bg-zinc-200" />
        <div
          className="absolute top-0 left-0 right-0 bg-zinc-700 transition-all duration-500 ease-out"
          style={{ height: `${100 - sentePercent}%` }}
        />
        <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-400/50" />
      </div>
      <span className="text-xs text-zinc-500">☗先手</span>
      <div
        className={`text-base font-mono font-bold tabular-nums mt-1 ${
          isSenteAdvantage ? "text-zinc-200" : "text-zinc-400"
        }`}
        data-testid="eval-value"
      >
        {displayValue}
      </div>
    </div>
  );
}
