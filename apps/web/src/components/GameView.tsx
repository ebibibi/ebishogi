"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MoveOrDrop, Color } from "shogiops/types";
import { ShogiBoard } from "@/components/board";
import { EvalBar } from "@/components/EvalBar";
import { useAIAssist } from "@/hooks/useAIAssist";
import {
  createGame,
  applyMoveToGame,
  usiToMove,
  type GameState,
} from "@/lib/shogi-game";
import { getEngine } from "@/lib/engine";

export function GameView({ onBack }: { onBack: () => void }) {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [playerColor] = useState<Color>("sente");
  const [aiThinking, setAiThinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef(false);

  const aiThinkingRef = useRef(false);

  const isPlayerTurn = game.turn === playerColor;
  const { arrows, badMoveAlert, engineReady, currentEval, evaluatePlayerMove } = useAIAssist(
    game,
    isPlayerTurn,
    true,
  );

  const handleMove = useCallback(
    (move: MoveOrDrop) => {
      if (!isPlayerTurn || game.isEnd) return;

      const newGame = applyMoveToGame(game, move);
      if (!newGame) return;

      setGame(newGame);
      setMessage(null);

      if (newGame.isCheck && !newGame.isEnd) {
        setMessage("王手！");
      }

      if (newGame.isEnd) {
        const winner = newGame.outcome?.winner;
        if (winner === playerColor) {
          setMessage("あなたの勝ち！");
        } else if (winner) {
          setMessage("CPUの勝ち...");
        } else {
          setMessage("引き分け");
        }
      }
    },
    [game, isPlayerTurn, playerColor],
  );

  useEffect(() => {
    if (game.isEnd || isPlayerTurn || aiThinkingRef.current) return;

    aiThinkingRef.current = true;
    setAiThinking(true);
    abortRef.current = false;

    const playCpuMove = async () => {
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

        const usi = result.bestmove;
        if (!usi) return;

        const move = usiToMove(usi);
        if (!move) return;

        const newGame = applyMoveToGame(game, move);
        if (!newGame) return;

        setGame(newGame);

        if (newGame.isCheck && !newGame.isEnd) {
          setMessage("王手！");
        }
        if (newGame.isEnd) {
          const winner = newGame.outcome?.winner;
          if (winner === playerColor) {
            setMessage("あなたの勝ち！");
          } else if (winner) {
            setMessage("CPUの勝ち...");
          } else {
            setMessage("引き分け");
          }
        }
      } catch {
        // Engine not available
      } finally {
        aiThinkingRef.current = false;
        if (!abortRef.current) setAiThinking(false);
      }
    };

    playCpuMove();

    return () => {
      abortRef.current = true;
    };
  }, [game, isPlayerTurn, playerColor, evaluatePlayerMove]);

  const handleReset = useCallback(() => {
    abortRef.current = true;
    aiThinkingRef.current = false;
    getEngine().cancelSearch();
    setGame(createGame());
    setMessage(null);
    setAiThinking(false);
  }, []);

  const checkSquare = game.isCheck ? findKingSquare(game, game.turn) : null;

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-1">ebishogi</h1>

      <div className="flex items-center gap-2">
        <EvalBar eval_cp={currentEval} />
        <ShogiBoard
          position={game.position}
          orientation={playerColor}
          arrows={arrows}
          onMove={handleMove}
          lastMove={game.lastMove}
          interactive={isPlayerTurn && !game.isEnd}
          checkSquare={checkSquare ?? undefined}
        />
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        {badMoveAlert && (
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

        <div className="flex gap-2 mt-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
            type="button"
          >
            新しい対局
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
    </div>
  );
}

function findKingSquare(
  game: GameState,
  color: Color,
): number | null {
  const kings = game.position.kingsOf(color);
  for (const sq of kings) return sq;
  return null;
}
