"use client";

import { useState, useCallback, useEffect } from "react";

export type CpuLevel = {
  readonly name: string;
  readonly description: string;
  readonly skillLevel: number;
  readonly depth: number;
  readonly candidates: number;
};

export const CPU_LEVELS: readonly CpuLevel[] = [
  { name: "10級", description: "ゆるく遊べる", skillLevel: 0, depth: 1, candidates: 3 },
  { name: "7級", description: "駒の動かし方を学ぶ", skillLevel: 3, depth: 2, candidates: 3 },
  { name: "5級", description: "基本が身につく", skillLevel: 7, depth: 3, candidates: 2 },
  { name: "3級", description: "戦いを楽しめる", skillLevel: 11, depth: 5, candidates: 1 },
  { name: "1級", description: "読みが深くなる", skillLevel: 14, depth: 8, candidates: 1 },
  { name: "初段", description: "本格的な将棋", skillLevel: 17, depth: 12, candidates: 1 },
  { name: "三段", description: "かなり手強い", skillLevel: 19, depth: 0, candidates: 1 },
  { name: "最強", description: "容赦なし", skillLevel: 20, depth: 0, candidates: 1 },
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
  cpuLevel: 7,
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
