"use client";

import { useState, useCallback, useEffect } from "react";

export type GameSettings = {
  arrowDelay3rd: number;
  arrowDelay2nd: number;
  arrowDelay1st: number;
  cpuMoveDelay: number;
  soundEnabled: boolean;
};

export const DEFAULT_SETTINGS: GameSettings = {
  arrowDelay3rd: 30,
  arrowDelay2nd: 45,
  arrowDelay1st: 60,
  cpuMoveDelay: 1500,
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
