"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { MoveOrDrop } from "shogiops/types";
import { squareFile, squareRank } from "shogiops/util";
import type { GameState } from "@/lib/shogi-game";
import { squareToCoords } from "@/lib/shogi-game";
import type { ArrowData } from "@/components/board";

export type BadMoveAlert = {
  message: string;
  severity: "blunder" | "mistake" | "inaccuracy";
};

type AIAssistState = {
  arrows: ArrowData[];
  badMoveAlert: BadMoveAlert | null;
};

const ARROW_COLORS = [
  { color: "#d4af37", opacity: 0.85, width: 5 },
  { color: "#c0c0c0", opacity: 0.55, width: 3.5 },
  { color: "#8b6914", opacity: 0.35, width: 2.5 },
];

const REVEAL_DELAYS = [8000, 5000, 3000];

export function useAIAssist(
  game: GameState,
  isPlayerTurn: boolean,
  enabled: boolean,
): AIAssistState {
  const [arrows, setArrows] = useState<ArrowData[]>([]);
  const [badMoveAlert, setBadMoveAlert] = useState<BadMoveAlert | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prevEvalRef = useRef<number | null>(null);

  useEffect(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
    setArrows([]);

    if (!enabled || !isPlayerTurn || game.isEnd) return;

    const candidates = getTopMoves(game, 3);
    if (candidates.length === 0) return;

    candidates.forEach((move, index) => {
      const delay = REVEAL_DELAYS[index] ?? REVEAL_DELAYS[2];
      const style = ARROW_COLORS[index] ?? ARROW_COLORS[2];

      const timer = setTimeout(() => {
        const arrow = moveToArrow(move, style);
        if (arrow) {
          setArrows((prev) => [...prev, arrow]);
        }
      }, delay);
      timersRef.current.push(timer);
    });

    return () => {
      for (const t of timersRef.current) clearTimeout(t);
    };
  }, [game, isPlayerTurn, enabled]);

  useEffect(() => {
    if (!enabled || isPlayerTurn) {
      setBadMoveAlert(null);
      return;
    }

    if (game.moveCount <= 1) {
      prevEvalRef.current = 0;
      return;
    }

    const currentEval = quickEval(game);
    const prevEval = prevEvalRef.current;

    if (prevEval !== null) {
      const diff = currentEval - prevEval;
      if (diff < -500) {
        setBadMoveAlert({ message: "大悪手！", severity: "blunder" });
      } else if (diff < -200) {
        setBadMoveAlert({ message: "悪手", severity: "mistake" });
      } else if (diff < -100) {
        setBadMoveAlert({ message: "疑問手", severity: "inaccuracy" });
      } else {
        setBadMoveAlert(null);
      }
    }
    prevEvalRef.current = currentEval;
  }, [game, isPlayerTurn, enabled]);

  return { arrows, badMoveAlert };
}

function getTopMoves(game: GameState, count: number): MoveOrDrop[] {
  const pos = game.position;
  const isSente = pos.turn === "sente";
  const scored: { move: MoveOrDrop; score: number }[] = [];

  const moveDests = pos.allMoveDests();
  for (const [from, dests] of moveDests) {
    for (const to of dests) {
      const move: MoveOrDrop = { from, to };
      if (!pos.isLegal(move)) continue;

      const piece = pos.board.get(from);
      const captured = pos.board.get(to);
      let score = Math.random() * 5;

      if (captured) {
        score += pieceValue(captured.role) * 2;
        if (piece) score += pieceValue(captured.role) - pieceValue(piece.role);
      }

      const testPos = pos.clone();
      testPos.play(move);
      if (testPos.isCheck()) score += 300;

      if (piece?.role === "pawn") {
        const file = squareFile(from) + 1;
        if ((isSente && file === 7) || (!isSente && file === 3)) score += 120;
        if ((isSente && file === 2) || (!isSente && file === 8)) score += 90;
        if (file >= 4 && file <= 6) score += 40;
        if (file === 1 || file === 9) score -= 30;
      }

      if (piece && piece.role !== "pawn" && piece.role !== "king") {
        const fromRank = squareRank(from);
        if ((isSente && fromRank >= 6) || (!isSente && fromRank <= 2)) score += 40;
      }

      const mobility = countMobility(testPos);
      score += mobility * 0.5;

      scored.push({ move, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.move);
}

function countMobility(pos: import("shogiops/variant/shogi").Shogi): number {
  let count = 0;
  for (const [, dests] of pos.allMoveDests()) {
    for (const _ of dests) count++;
  }
  return count;
}

function moveToArrow(
  move: MoveOrDrop,
  style: { color: string; opacity: number; width: number },
): ArrowData | null {
  if (!("from" in move)) return null;
  const from = squareToCoords(move.from);
  const to = squareToCoords(move.to);
  return {
    fromFile: from.file,
    fromRank: from.rank,
    toFile: to.file,
    toRank: to.rank,
    ...style,
  };
}

function quickEval(game: GameState): number {
  let score = 0;
  for (const [sq, piece] of game.position.board) {
    const value = pieceValue(piece.role);
    score += piece.color === "sente" ? value : -value;
  }
  return score;
}

function pieceValue(role: string): number {
  const values: Record<string, number> = {
    pawn: 100, lance: 300, knight: 350, silver: 450,
    gold: 500, bishop: 700, rook: 800,
    tokin: 500, promotedlance: 500, promotedknight: 500, promotedsilver: 500,
    horse: 1000, dragon: 1100, king: 0,
  };
  return values[role] ?? 0;
}
