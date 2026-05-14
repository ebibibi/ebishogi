"use client";

import { useState, useCallback, useMemo } from "react";
import { createGame, type GameState } from "@/lib/shogi-game";

export type HistoryEntry = {
  state: GameState;
  evalCp: number | null;
};

type HistoryState = {
  entries: HistoryEntry[];
  viewIndex: number;
};

function createInitialState(): HistoryState {
  return {
    entries: [{ state: createGame(), evalCp: null }],
    viewIndex: 0,
  };
}

export function useGameHistory() {
  const [hist, setHist] = useState<HistoryState>(createInitialState);

  const current = hist.entries[hist.viewIndex];
  const isLive = hist.viewIndex === hist.entries.length - 1;

  const pushMove = useCallback(
    (state: GameState, evalCp: number | null) => {
      setHist((prev) => ({
        entries: [
          ...prev.entries.slice(0, prev.viewIndex + 1),
          { state, evalCp },
        ],
        viewIndex: prev.viewIndex + 1,
      }));
    },
    [],
  );

  const takeBack = useCallback(() => {
    setHist((prev) => {
      const newIdx = Math.max(0, prev.viewIndex - 2);
      return {
        entries: prev.entries.slice(0, newIdx + 1),
        viewIndex: newIdx,
      };
    });
  }, []);

  const stepBack = useCallback(() => {
    setHist((prev) => ({
      ...prev,
      viewIndex: Math.max(0, prev.viewIndex - 1),
    }));
  }, []);

  const stepForward = useCallback(() => {
    setHist((prev) => ({
      ...prev,
      viewIndex: Math.min(prev.viewIndex + 1, prev.entries.length - 1),
    }));
  }, []);

  const goToLatest = useCallback(() => {
    setHist((prev) => ({
      ...prev,
      viewIndex: prev.entries.length - 1,
    }));
  }, []);

  const goTo = useCallback((index: number) => {
    setHist((prev) => ({
      ...prev,
      viewIndex: Math.max(0, Math.min(index, prev.entries.length - 1)),
    }));
  }, []);

  const resumeFromCurrent = useCallback(() => {
    setHist((prev) => ({
      entries: prev.entries.slice(0, prev.viewIndex + 1),
      viewIndex: prev.viewIndex,
    }));
  }, []);

  const reset = useCallback(() => setHist(createInitialState()), []);

  const evalHistory = useMemo(
    () => hist.entries.map((e) => e.evalCp),
    [hist.entries],
  );

  return {
    game: current.state,
    entries: hist.entries,
    viewIndex: hist.viewIndex,
    isLive,
    canTakeBack: hist.viewIndex >= 2,
    canStepBack: hist.viewIndex > 0,
    canStepForward: hist.viewIndex < hist.entries.length - 1,
    pushMove,
    takeBack,
    stepBack,
    stepForward,
    goToLatest,
    goTo,
    resumeFromCurrent,
    reset,
    evalHistory,
  };
}
