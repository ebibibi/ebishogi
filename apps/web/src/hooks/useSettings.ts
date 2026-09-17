"use client";

import { useCallback } from "react";

import { useLocalStorageState } from "@/hooks/useLocalStorageState";

export type CpuLevel = {
  readonly name: string;
  readonly description: string;
  readonly depth: number;
  readonly candidates: number;
};

export const CPU_LEVELS: readonly CpuLevel[] = [
  { name: "10級", description: "ゆるく遊べる", depth: 1, candidates: 3 },
  { name: "9級", description: "のんびり対局", depth: 1, candidates: 3 },
  { name: "8級", description: "少し手ごたえあり", depth: 2, candidates: 3 },
  { name: "7級", description: "駒の使い方を学ぶ", depth: 2, candidates: 2 },
  { name: "6級", description: "攻めの形がわかる", depth: 3, candidates: 2 },
  { name: "5級", description: "基本が身につく", depth: 3, candidates: 2 },
  { name: "4級", description: "中盤力がつく", depth: 4, candidates: 1 },
  { name: "3級", description: "戦いを楽しめる", depth: 5, candidates: 1 },
  { name: "2級", description: "終盤が鋭くなる", depth: 6, candidates: 1 },
  { name: "1級", description: "読みが深くなる", depth: 8, candidates: 1 },
  { name: "初段", description: "本格的な将棋", depth: 10, candidates: 1 },
  { name: "二段", description: "隙のない指し回し", depth: 12, candidates: 1 },
  { name: "三段", description: "かなり手強い", depth: 0, candidates: 1 },
  { name: "四段", description: "アマ強豪クラス", depth: 0, candidates: 1 },
  { name: "最強", description: "容赦なし", depth: 0, candidates: 1 },
];

export type GameSettings = {
  arrowDelay3rd: number;
  arrowDelay2nd: number;
  arrowDelay1st: number;
  cpuMoveDelay: number;
  cpuLevel: number;
  soundEnabled: boolean;
  showHints: boolean;
};

export const DEFAULT_SETTINGS: GameSettings = {
  arrowDelay3rd: 30,
  arrowDelay2nd: 45,
  arrowDelay1st: 60,
  cpuMoveDelay: 1500,
  cpuLevel: 14,
  soundEnabled: true,
  showHints: true,
};

const STORAGE_KEY = "ebishogi-settings";

export function useSettings() {
  // 保存済みの設定は既定値にマージする（項目追加時に既存ユーザーが欠損しないように）
  const [settings, setSettings, resetSettings] =
    useLocalStorageState<GameSettings>(STORAGE_KEY, DEFAULT_SETTINGS, {
      merge: true,
    });

  const updateSettings = useCallback(
    (partial: Partial<GameSettings>) => {
      setSettings((prev) => ({ ...prev, ...partial }));
    },
    [setSettings],
  );

  return { settings, updateSettings, resetSettings };
}
