"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MoveOrDrop, Color } from "shogiops/types";
import { ShogiBoard } from "@/components/board";
import { EvalBar } from "@/components/EvalBar";
import { ArrowTimerMeter } from "@/components/ArrowTimerMeter";
import { EvalGraph } from "@/components/EvalGraph";
import { GameControls } from "@/components/GameControls";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useAIAssist } from "@/hooks/useAIAssist";
import { useBoardSize } from "@/hooks/useBoardSize";
import { useGameHistory } from "@/hooks/useGameHistory";
import { useSettings } from "@/hooks/useSettings";
import { useSound } from "@/hooks/useSound";
import {
  applyMoveToGame,
  usiToMove,
  squareToCoords,
} from "@/lib/shogi-game";
import { getEngine } from "@/lib/engine";

export function GameView({ onBack }: { onBack: () => void }) {
  const {
    game,
    viewIndex,
    isLive,
    canTakeBack,
    canStepBack,
    canStepForward,
    pushMove,
    takeBack,
    stepBack,
    stepForward,
    goToLatest,
    goTo,
    resumeFromCurrent,
    reset,
    evalHistory,
  } = useGameHistory();

  const { settings, updateSettings, resetSettings } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const { cellSize, compact } = useBoardSize(containerRef);
  const boardPx = cellSize * 9;
  const [playerColor] = useState<Color>("sente");
  const [aiThinking, setAiThinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const abortRef = useRef(false);
  const aiThinkingRef = useRef(false);
  const [captureInfo, setCaptureInfo] = useState<{
    file: number;
    rank: number;
  } | null>(null);
  const [captureTrigger, setCaptureTrigger] = useState(0);
  const [shaking, setShaking] = useState(false);

  const isPlayerTurn = game.turn === playerColor;
  const isInteractive = isLive && isPlayerTurn && !game.isEnd;

  const {
    arrows,
    badMoveAlert,
    engineReady,
    currentEval,
    evaluatePlayerMove,
    thinkingElapsed,
  } = useAIAssist(game, isPlayerTurn && isLive, settings);

  const { playMove, playCapture, playCheck } = useSound(
    settings.soundEnabled,
  );

  const triggerCapture = useCallback(
    (sq: number) => {
      const coords = squareToCoords(sq);
      setCaptureInfo({ file: coords.file, rank: coords.rank });
      setCaptureTrigger((n) => n + 1);
      setShaking(true);
      setTimeout(() => setShaking(false), 200);
    },
    [],
  );

  const handleMove = useCallback(
    (move: MoveOrDrop) => {
      if (!isInteractive) return;
      const newGame = applyMoveToGame(game, move);
      if (!newGame) return;

      const isCapt =
        "from" in move && game.position.board.get(move.to) !== undefined;
      if (isCapt) {
        playCapture();
        triggerCapture(move.to);
      } else {
        playMove();
      }

      pushMove(newGame, currentEval);
      setMessage(null);

      if (newGame.isCheck && !newGame.isEnd) {
        playCheck();
        setMessage("王手！");
      }
      if (newGame.isEnd) {
        const winner = newGame.outcome?.winner;
        if (winner === playerColor) setMessage("あなたの勝ち！");
        else if (winner) setMessage("CPUの勝ち...");
        else setMessage("引き分け");
      }
    },
    [
      game,
      isInteractive,
      playerColor,
      currentEval,
      pushMove,
      playMove,
      playCapture,
      playCheck,
      triggerCapture,
    ],
  );

  useEffect(() => {
    if (!isLive || game.isEnd || isPlayerTurn || aiThinkingRef.current) return;

    aiThinkingRef.current = true;
    setAiThinking(true);
    abortRef.current = false;

    const run = async () => {
      try {
        const engine = getEngine();
        const result = await engine.search(game.sfen, {
          multiPV: 1,
          timeMs: 500,
        });
        if (abortRef.current) return;

        if (result.candidates.length > 0) {
          evaluatePlayerMove(result.candidates[0].score);
        }

        if (settings.cpuMoveDelay > 0) {
          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, settings.cpuMoveDelay);
            const check = setInterval(() => {
              if (abortRef.current) {
                clearTimeout(t);
                clearInterval(check);
                resolve();
              }
            }, 100);
            setTimeout(() => clearInterval(check), settings.cpuMoveDelay + 50);
          });
        }
        if (abortRef.current) return;

        const usi = result.bestmove;
        if (!usi) return;
        const move = usiToMove(usi);
        if (!move) return;
        const newGame = applyMoveToGame(game, move);
        if (!newGame) return;

        const isCapt =
          "from" in move && game.position.board.get(move.to) !== undefined;
        if (isCapt) {
          playCapture();
          triggerCapture(move.to);
        } else {
          playMove();
        }

        const cpuScore = result.candidates[0]?.score;
        pushMove(newGame, cpuScore !== undefined ? -cpuScore : null);

        if (newGame.isCheck && !newGame.isEnd) {
          playCheck();
          setMessage("王手！");
        } else {
          setMessage(null);
        }
        if (newGame.isEnd) {
          const winner = newGame.outcome?.winner;
          if (winner === playerColor) setMessage("あなたの勝ち！");
          else if (winner) setMessage("CPUの勝ち...");
          else setMessage("引き分け");
        }
      } catch {
        /* engine unavailable */
      } finally {
        aiThinkingRef.current = false;
        if (!abortRef.current) setAiThinking(false);
      }
    };

    run();
    return () => {
      abortRef.current = true;
    };
  }, [
    game,
    isPlayerTurn,
    isLive,
    playerColor,
    settings.cpuMoveDelay,
    evaluatePlayerMove,
    pushMove,
    playMove,
    playCapture,
    playCheck,
    triggerCapture,
  ]);

  const handleReset = useCallback(() => {
    abortRef.current = true;
    aiThinkingRef.current = false;
    getEngine().cancelSearch();
    reset();
    setMessage(null);
    setAiThinking(false);
  }, [reset]);

  const handleTakeBack = useCallback(() => {
    abortRef.current = true;
    aiThinkingRef.current = false;
    getEngine().cancelSearch();
    takeBack();
    setMessage(null);
    setAiThinking(false);
  }, [takeBack]);

  const checkSquare = game.isCheck
    ? findKingSquare(game, game.turn)
    : null;

  return (
    <div
      ref={containerRef}
      className={`bg-zinc-900 text-white flex flex-col items-center select-none ${compact ? "h-[100dvh] overflow-hidden justify-start pt-1" : "min-h-screen justify-center p-1"}`}
    >
      {!compact && <h1 className="text-xl font-bold mb-1 tracking-tight">ebishogi</h1>}

      <div className={`flex items-start gap-2 ${shaking ? "animate-shake" : ""}`}>
        {!compact && <EvalBar eval_cp={currentEval} height={boardPx} />}
        <div className="flex flex-col items-center">
          <ShogiBoard
            position={game.position}
            orientation={playerColor}
            arrows={arrows}
            onMove={handleMove}
            lastMove={game.lastMove}
            interactive={isInteractive}
            checkSquare={checkSquare ?? undefined}
            moveCount={game.moveCount}
            captureSquare={captureInfo}
            captureTrigger={captureTrigger}
            cellSize={cellSize}
            compact={compact}
          />
          <GameControls
            canTakeBack={canTakeBack && isLive}
            canStepBack={canStepBack}
            canStepForward={canStepForward}
            isLive={isLive}
            onTakeBack={handleTakeBack}
            onStepBack={stepBack}
            onStepForward={stepForward}
            onGoToLatest={goToLatest}
            onResume={resumeFromCurrent}
          />
        </div>
      </div>

      {!compact && (
        <EvalGraph
          evalHistory={evalHistory}
          currentIndex={viewIndex}
          onClickMove={goTo}
          width={boardPx}
        />
      )}

      {!compact && (
        <ArrowTimerMeter
          elapsed={thinkingElapsed}
          settings={settings}
          active={isPlayerTurn && isLive && engineReady && !game.isEnd}
        />
      )}

      <div className={`flex flex-col items-center gap-1 ${compact ? "mt-1" : "mt-2 gap-1.5 min-h-[80px]"}`}>
        <div className={`${compact ? "h-7" : "h-10"} flex items-center justify-center`}>
          {badMoveAlert && isLive ? (
            <div
              className={`${compact ? "text-sm" : "text-lg"} font-bold px-3 py-1 rounded-lg animate-bounce ${
                badMoveAlert.severity === "blunder"
                  ? "bg-red-700/40 text-red-200"
                  : badMoveAlert.severity === "mistake"
                    ? "bg-orange-600/40 text-orange-200"
                    : "bg-yellow-600/30 text-yellow-200"
              }`}
            >
              {badMoveAlert.message}
            </div>
          ) : message ? (
            <div
              className={`${compact ? "text-sm" : "text-lg"} font-bold px-3 py-1 rounded-lg ${
                message.includes("勝ち")
                  ? "bg-yellow-600/30 text-yellow-300"
                  : message.includes("王手")
                    ? "bg-red-600/30 text-red-300"
                    : "bg-gray-600/30 text-gray-300"
              }`}
            >
              {message}
            </div>
          ) : !isLive ? (
            <div className="text-amber-400/80 text-xs">
              棋譜閲覧中（{viewIndex}手目）
            </div>
          ) : null}
        </div>

        <div className={`flex items-center gap-3 ${compact ? "text-xs" : "text-sm"} text-zinc-400 h-4`}>
          <span>{game.turn === "sente" ? "先手" : "後手"}の番</span>
          <span>{game.moveCount}手目</span>
          {!engineReady && (
            <span className="text-amber-400 animate-pulse">
              AI読込中...
            </span>
          )}
          {aiThinking && engineReady && (
            <span className="text-sky-400 animate-pulse">CPU思考中...</span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className={`${compact ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"} bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors`}
            type="button"
          >
            新しい対局
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className={`${compact ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"} bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors`}
            type="button"
          >
            設定
          </button>
          <button
            onClick={onBack}
            className={`${compact ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"} bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400`}
            type="button"
          >
            トップへ
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onReset={resetSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function findKingSquare(
  game: { position: { kingsOf: (c: Color) => Iterable<number> } },
  color: Color,
): number | null {
  for (const sq of game.position.kingsOf(color)) return sq;
  return null;
}
