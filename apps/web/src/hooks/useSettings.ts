"use client";

import { useState, useCallback, useEffect } from "react";

export type CpuLevel = {
  readonly name: string;
  readonly description: string;
  readonly depth: number;
  readonly candidates: number;
};

export const CPU_LEVELS: readonly CpuLevel[] = [
  { name: "入門", description: "ゆるく遊べる", depth: 1, candidates: 3 },
  { name: "初級", description: "少し考える", depth: 2, candidates: 2 },
  { name: "中級", description: "なかなか強い", depth: 4, candidates: 1 },
  { name: "上級", description: "本気モード", depth: 8, candidates: 1 },
  { name: "最強", description: "全力探索", depth: 0, candidates: 1 },
];

export type GameSettings = {
  arrowDelay3rd: number;
  arrowDelay2nd: number;
  arrowDelay1st: number;
  cpuMoveDelay: number;
  cpuLevel: number;
  soundEnabled: boolean;
};

export const DEFAULT_SETTINGS: GameSettings = {
  arrowDelay3rd: 30,
  arrowDelay2nd: 45,
  arrowDelay1st: 60,
  cpuMoveDelay: 1500,
  cpuLevel: 4,
  soundEnabled: true,
};

const STORAGE_KEY = "ebishogi-settings";

export function useSettings() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  return { settings, updateSettings, resetSettings };
}
