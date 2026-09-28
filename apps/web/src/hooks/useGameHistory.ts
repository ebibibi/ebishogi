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

function createInitialState(sfen?: string): HistoryState {
  return {
    entries: [{ state: createGame(sfen), evalCp: null }],
    viewIndex: 0,
  };
}

/** 読み込んだ棋譜などの局面列から履歴を作る。評価値は持たない。 */
function stateFromGames(
  states: readonly GameState[],
  viewIndex: number,
): HistoryState {
  return {
    entries: states.map((state) => ({ state, evalCp: null })),
    viewIndex: Math.max(0, Math.min(viewIndex, states.length - 1)),
  };
}

/**
 * @param restore 初回だけ呼ばれ、局面列を返せばその最新局面から再開する
 *   （リロード前の対局の復元用）。null なら initialSfen から始める。
 */
export function useGameHistory(
  initialSfen?: string,
  restore?: () => readonly GameState[] | null,
) {
  const [hist, setHist] = useState<HistoryState>(() => {
    const restored = restore?.();
    return restored && restored.length > 0
      ? stateFromGames(restored, restored.length - 1)
      : createInitialState(initialSfen);
  });

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

  /** 局面列で履歴を置き換える（棋譜の読込）。viewIndex の局面を表示する。 */
  const load = useCallback(
    (states: readonly GameState[], viewIndex = 0) => {
      if (states.length > 0) setHist(stateFromGames(states, viewIndex));
    },
    [],
  );

  const reset = useCallback(
    () => setHist(createInitialState(initialSfen)),
    [initialSfen],
  );

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
    load,
    reset,
    evalHistory,
  };
}
