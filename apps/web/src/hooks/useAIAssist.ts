"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { parseUsi } from "shogiops/util";
import type { GameState } from "@/lib/shogi-game";
import { squareToCoords } from "@/lib/shogi-game";
import { getEngine } from "@/lib/engine";
import type { CandidateMove } from "@/lib/engine";
import type { ArrowData } from "@/components/board";
import type { GameSettings } from "@/hooks/useSettings";

export type BadMoveAlert = {
  message: string;
  severity: "blunder" | "mistake" | "inaccuracy";
};

type AIAssistResult = {
  arrows: ArrowData[];
  badMoveAlert: BadMoveAlert | null;
  engineReady: boolean;
  currentEval: number | null;
  evaluatePlayerMove: (cpuScore: number) => void;
  thinkingElapsed: number;
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
  active: boolean,
  settings: GameSettings,
): AIAssistResult {
  const [candidates, setCandidates] = useState<readonly CandidateMove[]>([]);
  const [visibleRanks, setVisibleRanks] = useState<Set<number>>(new Set());
  const [badMoveAlert, setBadMoveAlert] = useState<BadMoveAlert | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [currentEval, setCurrentEval] = useState<number | null>(null);
  const [thinkingElapsed, setThinkingElapsed] = useState(0);
  const prevEvalRef = useRef<number | null>(null);
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
  }, [active, engineReady, game.isEnd]);

  const arrows = useMemo(() => {
    if (visibleRanks.size === 0) return [];
    return candidates
      .filter((c) => visibleRanks.has(c.rank))
      .map((c) => candidateToArrow(c, c.rank - 1))
      .filter((a): a is ArrowData => a !== null);
  }, [candidates, visibleRanks]);

  useEffect(() => {
    if (active) setBadMoveAlert(null);
  }, [active]);

  const evaluatePlayerMove = useCallback(
    (cpuScore: number) => {
      const playerScoreAfter = -cpuScore;
      setCurrentEval(playerScoreAfter);

      if (game.moveCount <= 1) {
        prevEvalRef.current = 0;
        return;
      }
      const prevEval = prevEvalRef.current;
      if (prevEval === null) return;
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

  return {
    arrows,
    badMoveAlert,
    engineReady,
    currentEval,
    evaluatePlayerMove,
    thinkingElapsed,
  };
}
