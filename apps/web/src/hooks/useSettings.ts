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
  { name: "9級", description: "のんびり対局", skillLevel: 1, depth: 1, candidates: 3 },
  { name: "8級", description: "少し手ごたえあり", skillLevel: 3, depth: 2, candidates: 3 },
  { name: "7級", description: "駒の使い方を学ぶ", skillLevel: 4, depth: 2, candidates: 2 },
  { name: "6級", description: "攻めの形がわかる", skillLevel: 6, depth: 3, candidates: 2 },
  { name: "5級", description: "基本が身につく", skillLevel: 7, depth: 3, candidates: 2 },
  { name: "4級", description: "中盤力がつく", skillLevel: 9, depth: 4, candidates: 1 },
  { name: "3級", description: "戦いを楽しめる", skillLevel: 10, depth: 5, candidates: 1 },
  { name: "2級", description: "終盤が鋭くなる", skillLevel: 12, depth: 6, candidates: 1 },
  { name: "1級", description: "読みが深くなる", skillLevel: 13, depth: 8, candidates: 1 },
  { name: "初段", description: "本格的な将棋", skillLevel: 15, depth: 10, candidates: 1 },
  { name: "二段", description: "隙のない指し回し", skillLevel: 17, depth: 12, candidates: 1 },
  { name: "三段", description: "かなり手強い", skillLevel: 18, depth: 0, candidates: 1 },
  { name: "四段", description: "アマ強豪クラス", skillLevel: 19, depth: 0, candidates: 1 },
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
  cpuLevel: 14,
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
