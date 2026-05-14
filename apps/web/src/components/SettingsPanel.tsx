"use client";

import type { GameSettings } from "@/hooks/useSettings";

type Props = {
  settings: GameSettings;
  onUpdate: (partial: Partial<GameSettings>) => void;
  onReset: () => void;
  onClose: () => void;
};

export function SettingsPanel({ settings, onUpdate, onReset, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative z-10 bg-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-bold mb-4">設定</h2>

        <section className="mb-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">
            候補手の表示タイミング
          </h3>
          <Slider
            label="3番手"
            value={settings.arrowDelay3rd}
            min={5}
            max={120}
            step={5}
            fmt={(v) => `${v}秒`}
            onChange={(v) => onUpdate({ arrowDelay3rd: v })}
          />
          <Slider
            label="2番手"
            value={settings.arrowDelay2nd}
            min={5}
            max={120}
            step={5}
            fmt={(v) => `${v}秒`}
            onChange={(v) => onUpdate({ arrowDelay2nd: v })}
          />
          <Slider
            label="1番手"
            value={settings.arrowDelay1st}
            min={10}
            max={180}
            step={5}
            fmt={(v) => `${v}秒`}
            onChange={(v) => onUpdate({ arrowDelay1st: v })}
          />
        </section>

        <section className="mb-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">CPU</h3>
          <Slider
            label="着手遅延"
            value={settings.cpuMoveDelay}
            min={0}
            max={5000}
            step={250}
            fmt={(v) =>
              v < 1000 ? `${v}ms` : `${(v / 1000).toFixed(1)}秒`
            }
            onChange={(v) => onUpdate({ cpuMoveDelay: v })}
          />
        </section>

        <section className="mb-6 flex items-center justify-between">
          <span className="text-sm text-zinc-300">効果音</span>
          <button
            onClick={() => onUpdate({ soundEnabled: !settings.soundEnabled })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.soundEnabled ? "bg-amber-600" : "bg-zinc-600"
            }`}
            type="button"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                settings.soundEnabled ? "translate-x-6" : ""
              }`}
            />
          </button>
        </section>

        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="flex-1 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
            type="button"
          >
            リセット
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors font-bold"
            type="button"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  fmt,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-sm text-zinc-400 w-16 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-amber-500 h-1.5"
      />
      <span className="text-xs text-zinc-400 w-14 text-right tabular-nums">
        {fmt(value)}
      </span>
    </div>
  );
}
