"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MoveOrDrop, Color } from "shogiops/types";
import { ShogiBoard } from "@/components/board";
import { EvalBar } from "@/components/EvalBar";
import { EvalGraph } from "@/components/EvalGraph";
import { GameControls } from "@/components/GameControls";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useAIAssist } from "@/hooks/useAIAssist";
import { useGameHistory } from "@/hooks/useGameHistory";
import { useSettings } from "@/hooks/useSettings";
import { useSound } from "@/hooks/useSound";
import { applyMoveToGame, usiToMove } from "@/lib/shogi-game";
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
  const [playerColor] = useState<Color>("sente");
  const [aiThinking, setAiThinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const abortRef = useRef(false);
  const aiThinkingRef = useRef(false);

  const isPlayerTurn = game.turn === playerColor;
  const isInteractive = isLive && isPlayerTurn && !game.isEnd;

  const {
    arrows,
    badMoveAlert,
    engineReady,
    currentEval,
    evaluatePlayerMove,
  } = useAIAssist(game, isPlayerTurn && isLive, settings);

  const { playMove, playCapture, playCheck } = useSound(
    settings.soundEnabled,
  );

  const handleMove = useCallback(
    (move: MoveOrDrop) => {
      if (!isInteractive) return;
      const newGame = applyMoveToGame(game, move);
      if (!newGame) return;

      const isCapt =
        "from" in move && game.position.board.get(move.to) !== undefined;
      if (isCapt) playCapture();
      else playMove();

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
        if (isCapt) playCapture();
        else playMove();

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
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-4 select-none">
      <h1 className="text-2xl font-bold mb-2 tracking-tight">ebishogi</h1>

      <div className="flex items-start gap-2">
        <EvalBar eval_cp={currentEval} />
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

      <EvalGraph
        evalHistory={evalHistory}
        currentIndex={viewIndex}
        onClickMove={goTo}
      />

      <div className="mt-3 flex flex-col items-center gap-2">
        {badMoveAlert && isLive && (
          <div
            className={`text-lg font-bold px-4 py-2 rounded-lg animate-bounce ${
              badMoveAlert.severity === "blunder"
                ? "bg-red-700/40 text-red-200"
                : badMoveAlert.severity === "mistake"
                  ? "bg-orange-600/40 text-orange-200"
                  : "bg-yellow-600/30 text-yellow-200"
            }`}
          >
            {badMoveAlert.message}
          </div>
        )}

        {message && (
          <div
            className={`text-lg font-bold px-4 py-2 rounded-lg ${
              message.includes("勝ち")
                ? "bg-yellow-600/30 text-yellow-300"
                : message.includes("王手")
                  ? "bg-red-600/30 text-red-300"
                  : "bg-gray-600/30 text-gray-300"
            }`}
          >
            {message}
          </div>
        )}

        {!isLive && (
          <div className="text-amber-400/80 text-sm">
            棋譜閲覧中（{viewIndex}手目）
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>{game.turn === "sente" ? "先手" : "後手"}の番</span>
          <span>手数: {game.moveCount}</span>
          {!engineReady && (
            <span className="text-amber-400 animate-pulse">
              AIエンジン読込中...
            </span>
          )}
          {aiThinking && engineReady && (
            <span className="text-sky-400 animate-pulse">CPU思考中...</span>
          )}
        </div>

        <div className="flex gap-2 mt-1">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
            type="button"
          >
            新しい対局
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
            type="button"
          >
            設定
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400"
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
