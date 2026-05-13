"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { parseUsi } from "shogiops/util";
import type { GameState } from "@/lib/shogi-game";
import { squareToCoords } from "@/lib/shogi-game";
import { getEngine } from "@/lib/engine";
import type { CandidateMove } from "@/lib/engine";
import type { ArrowData } from "@/components/board";

export type BadMoveAlert = {
  message: string;
  severity: "blunder" | "mistake" | "inaccuracy";
};

type AIAssistResult = {
  arrows: ArrowData[];
  badMoveAlert: BadMoveAlert | null;
  engineReady: boolean;
  evaluatePlayerMove: (cpuScore: number) => void;
};

const ARROW_STYLES = [
  { color: "#d4af37", opacity: 0.85, width: 5 },
  { color: "#c0c0c0", opacity: 0.55, width: 3.5 },
  { color: "#8b6914", opacity: 0.35, width: 2.5 },
];

function candidateToArrow(
  candidate: CandidateMove,
  index: number,
): ArrowData | null {
  const move = parseUsi(candidate.usi);
  if (!move || !("from" in move)) return null;

  const from = squareToCoords(move.from);
  const to = squareToCoords(move.to);
  const style = ARROW_STYLES[index] ?? ARROW_STYLES[2];

  return {
    fromFile: from.file,
    fromRank: from.rank,
    toFile: to.file,
    toRank: to.rank,
    ...style,
  };
}

export function useAIAssist(
  game: GameState,
  isPlayerTurn: boolean,
  enabled: boolean,
): AIAssistResult {
  const [arrows, setArrows] = useState<ArrowData[]>([]);
  const [badMoveAlert, setBadMoveAlert] = useState<BadMoveAlert | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const prevEvalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getEngine()
      .init()
      .then(() => {
        if (!cancelled) setEngineReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    setArrows([]);
    if (!enabled || !engineReady || !isPlayerTurn || game.isEnd) return;

    let cancelled = false;
    const engine = getEngine();

    engine
      .search(game.sfen, {
        multiPV: 3,
        timeMs: 3000,
        onInfo: (candidates) => {
          if (cancelled) return;
          const newArrows = candidates
            .map((c, i) => candidateToArrow(c, i))
            .filter((a): a is ArrowData => a !== null);
          setArrows(newArrows);
        },
      })
      .then((result) => {
        if (cancelled) return;
        if (result.candidates.length > 0) {
          prevEvalRef.current = result.candidates[0].score;
        }
        const finalArrows = result.candidates
          .map((c, i) => candidateToArrow(c, i))
          .filter((a): a is ArrowData => a !== null);
        setArrows(finalArrows);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      engine.cancelSearch();
    };
  }, [game, isPlayerTurn, enabled, engineReady]);

  useEffect(() => {
    if (isPlayerTurn) setBadMoveAlert(null);
  }, [isPlayerTurn]);

  const evaluatePlayerMove = useCallback(
    (cpuScore: number) => {
      if (game.moveCount <= 1) {
        prevEvalRef.current = 0;
        return;
      }
      const prevEval = prevEvalRef.current;
      if (prevEval === null) return;

      const playerScoreAfter = -cpuScore;
      const change = playerScoreAfter - prevEval;

      if (change < -500) {
        setBadMoveAlert({ message: "大悪手！", severity: "blunder" });
      } else if (change < -200) {
        setBadMoveAlert({ message: "悪手", severity: "mistake" });
      } else if (change < -100) {
        setBadMoveAlert({ message: "疑問手", severity: "inaccuracy" });
      } else {
        setBadMoveAlert(null);
      }
    },
    [game.moveCount],
  );

  return { arrows, badMoveAlert, engineReady, evaluatePlayerMove };
}
