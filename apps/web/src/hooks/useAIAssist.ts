"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { parseUsi, squareRank } from "shogiops/util";
import type { Role } from "shogiops/types";
import type { Shogi } from "shogiops/variant/shogi";
import type { GameState } from "@/lib/shogi-game";
import { squareToCoords } from "@/lib/shogi-game";
import { getEngine } from "@/lib/engine";
import type { CandidateMove } from "@/lib/engine";
import type { ArrowData } from "@/lib/canvas/layout";
import type { GameSettings } from "@/hooks/useSettings";

export type BadMoveAlert = {
  message: string;
  severity: "blunder" | "mistake" | "inaccuracy";
};

export type MoveGrade =
  | "best"
  | "great"
  | "good"
  | "neutral"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type MoveEvaluation = {
  grade: MoveGrade;
  label: string;
  evalBefore: number;
  evalAfter: number;
  evalChange: number;
  candidateRank: number | null;
  candidateTotal: number;
};

export const EVAL_DISPLAY_MS = 3000;

type AIAssistResult = {
  arrows: ArrowData[];
  badMoveAlert: BadMoveAlert | null;
  moveEvaluation: MoveEvaluation | null;
  engineReady: boolean;
  currentEval: number | null;
  evaluatePlayerMove: (cpuScore: number, playerMoveUsi: string) => boolean;
  thinkingElapsed: number;
};

const ARROW_STYLES = [
  { color: "#FFD700", opacity: 0.95, width: 8 },
  { color: "#87CEEB", opacity: 0.8, width: 6 },
  { color: "#CD853F", opacity: 0.6, width: 4.5 },
];

const PROMOTABLE_ROLES: ReadonlySet<Role> = new Set<Role>([
  "pawn", "lance", "knight", "silver", "bishop", "rook",
]);

function candidateToArrow(
  candidate: CandidateMove,
  index: number,
  position: Shogi,
): ArrowData | null {
  const move = parseUsi(candidate.usi);
  if (!move) return null;

  const to = squareToCoords(move.to);
  const style = ARROW_STYLES[index] ?? ARROW_STYLES[2];

  if ("from" in move) {
    const from = squareToCoords(move.from);
    let promotionLabel: "成" | "不成" | undefined;
    if (move.promotion) {
      promotionLabel = "成";
    } else {
      const piece = position.board.get(move.from);
      if (piece && PROMOTABLE_ROLES.has(piece.role)) {
        const fromR = squareRank(move.from);
        const toR = squareRank(move.to);
        const inZone = piece.color === "sente"
          ? (fromR <= 2 || toR <= 2)
          : (fromR >= 6 || toR >= 6);
        if (inZone) promotionLabel = "不成";
      }
    }
    return {
      fromFile: from.file,
      fromRank: from.rank,
      toFile: to.file,
      toRank: to.rank,
      rank: candidate.rank,
      promotionLabel,
      ...style,
    };
  }

  return {
    toFile: to.file,
    toRank: to.rank,
    dropRole: move.role,
    rank: candidate.rank,
    ...style,
  };
}

function classifyMove(
  change: number,
  candidateRank: number | null,
): { grade: MoveGrade; label: string } {
  if (candidateRank === 1 && change >= -20)
    return { grade: "best", label: "最善手！" };
  if (change >= -20) return { grade: "great", label: "好手！" };
  if (change >= -50) return { grade: "good", label: "良い手" };
  if (change >= -100) return { grade: "neutral", label: "普通" };
  if (change >= -200) return { grade: "inaccuracy", label: "疑問手" };
  if (change >= -500) return { grade: "mistake", label: "悪手" };
  return { grade: "blunder", label: "大悪手！" };
}

export function useAIAssist(
  game: GameState,
  active: boolean,
  settings: GameSettings,
): AIAssistResult {
  const [candidates, setCandidates] = useState<readonly CandidateMove[]>([]);
  const [visibleRanks, setVisibleRanks] = useState<Set<number>>(new Set());
  const [badMoveAlert, setBadMoveAlert] = useState<BadMoveAlert | null>(null);
  const [moveEvaluation, setMoveEvaluation] = useState<MoveEvaluation | null>(
    null,
  );
  const [engineReady, setEngineReady] = useState(false);
  const [currentEval, setCurrentEval] = useState<number | null>(null);
  const [thinkingElapsed, setThinkingElapsed] = useState(0);
  const prevEvalRef = useRef<number | null>(null);
  const playerCandidatesRef = useRef<readonly CandidateMove[]>([]);
  const thinkingStartRef = useRef<number | null>(null);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    setCandidates([]);
    setVisibleRanks(new Set());
    if (!active || !engineReady || game.isEnd) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const engine = getEngine();

    engine
      .search(game.sfen, {
        multiPV: 3,
        timeMs: 5000,
        onInfo: (infoCandidates) => {
          if (cancelled) return;
          setCandidates(infoCandidates);
          if (infoCandidates.length > 0) {
            setCurrentEval(infoCandidates[0].score);
          }
        },
      })
      .then((result) => {
        if (cancelled) return;
        setCandidates(result.candidates);
        playerCandidatesRef.current = result.candidates;
        if (result.candidates.length > 0) {
          prevEvalRef.current = result.candidates[0].score;
          setCurrentEval(result.candidates[0].score);
        }
      })
      .catch(() => {});

    timers.push(
      setTimeout(() => {
        if (!cancelled) setVisibleRanks((prev) => new Set([...prev, 3]));
      }, settings.arrowDelay3rd * 1000),
    );
    timers.push(
      setTimeout(() => {
        if (!cancelled) setVisibleRanks((prev) => new Set([...prev, 2]));
      }, settings.arrowDelay2nd * 1000),
    );
    timers.push(
      setTimeout(() => {
        if (!cancelled) setVisibleRanks((prev) => new Set([...prev, 1]));
      }, settings.arrowDelay1st * 1000),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      engine.cancelSearch();
    };
  }, [
    game,
    active,
    engineReady,
    settings.arrowDelay3rd,
    settings.arrowDelay2nd,
    settings.arrowDelay1st,
    settings.showHints,
  ]);

  useEffect(() => {
    if (!active || !engineReady || game.isEnd) {
      thinkingStartRef.current = null;
      setThinkingElapsed(0);
      return;
    }
    thinkingStartRef.current = performance.now();
    let raf: number;
    const tick = () => {
      if (thinkingStartRef.current !== null) {
        setThinkingElapsed(
          (performance.now() - thinkingStartRef.current) / 1000,
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, engineReady, game]);

  const arrows = useMemo(() => {
    if (!settings.showHints) return [];
    if (visibleRanks.size === 0) return [];
    return candidates
      .filter((c) => visibleRanks.has(c.rank))
      .map((c) => candidateToArrow(c, c.rank - 1, game.position))
      .filter((a): a is ArrowData => a !== null);
  }, [candidates, visibleRanks, game.position, settings.showHints]);

  useEffect(() => {
    if (!badMoveAlert) return;
    const timer = setTimeout(() => setBadMoveAlert(null), 3000);
    return () => clearTimeout(timer);
  }, [badMoveAlert]);

  useEffect(() => {
    if (!moveEvaluation) return;
    const timer = setTimeout(() => setMoveEvaluation(null), EVAL_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [moveEvaluation]);

  const evaluatePlayerMove = useCallback(
    (cpuScore: number, playerMoveUsi: string): boolean => {
      const playerScoreAfter = -cpuScore;
      setCurrentEval(playerScoreAfter);

      if (game.moveCount <= 1) {
        prevEvalRef.current = 0;
        return false;
      }
      const prevEval = prevEvalRef.current;
      if (prevEval === null) return false;
      const change = playerScoreAfter - prevEval;

      setBadMoveAlert(null);

      const stored = playerCandidatesRef.current;
      const matched = stored.find((c) => c.usi === playerMoveUsi);
      const candidateRank = matched?.rank ?? null;
      const { grade, label } = classifyMove(change, candidateRank);

      setMoveEvaluation({
        grade,
        label,
        evalBefore: prevEval,
        evalAfter: playerScoreAfter,
        evalChange: change,
        candidateRank,
        candidateTotal: stored.length,
      });
      return true;
    },
    [game.moveCount],
  );

  return {
    arrows,
    badMoveAlert,
    moveEvaluation,
    engineReady,
    currentEval,
    evaluatePlayerMove,
    thinkingElapsed,
  };
}
