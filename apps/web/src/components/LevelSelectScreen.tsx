"use client";

import { CPU_LEVELS } from "@/hooks/useSettings";

type Props = {
  cpuLevel: number;
  onSelect: (level: number) => void;
  onStart: () => void;
  onBack: () => void;
};

export function LevelSelectScreen({
  cpuLevel,
  onSelect,
  onStart,
  onBack,
}: Props) {
  const level = CPU_LEVELS[cpuLevel] ?? CPU_LEVELS[CPU_LEVELS.length - 1];

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full flex flex-col items-center gap-8">
        <h2 className="text-2xl font-bold">CPUの強さを選択</h2>

        <div className="w-full text-center">
          <p className="text-5xl font-bold text-amber-400 mb-2">
            {level.name}
          </p>
          <p className="text-zinc-400">{level.description}</p>
        </div>

        <div className="w-full">
          <input
            type="range"
            min={0}
            max={CPU_LEVELS.length - 1}
            step={1}
            value={cpuLevel}
            onChange={(e) => onSelect(Number(e.target.value))}
            className="w-full accent-amber-500 h-2"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>10級</span>
            <span>最強</span>
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full py-4 text-lg font-bold bg-amber-600 hover:bg-amber-500 active:bg-amber-700 rounded-xl transition-colors"
          type="button"
        >
          この強さで対局開始
        </button>

        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-white transition-colors text-sm"
          type="button"
        >
          戻る
        </button>
      </div>
    </div>
  );
}
