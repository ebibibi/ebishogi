"use client";

import { useCallback } from "react";

import { useLocalStorageState } from "@/hooks/useLocalStorageState";

export { CPU_LEVELS, type CpuLevel } from "@/lib/cpu-levels";

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
