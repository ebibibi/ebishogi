"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MoveOrDrop, Color } from "shogiops/types";
import { ShogiBoard } from "@/components/board";
import { useAIAssist } from "@/hooks/useAIAssist";
import {
  createGame,
  applyMoveToGame,
  usiToMove,
  type GameState,
} from "@/lib/shogi-game";
import { getEngine } from "@/lib/engine";

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [playerColor] = useState<Color>("sente");
  const [aiThinking, setAiThinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef(false);

  const isPlayerTurn = game.turn === playerColor;
  const { arrows, badMoveAlert, engineReady } = useAIAssist(
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
    if (game.isEnd || isPlayerTurn || aiThinking) return;

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
        // Engine not available - skip CPU turn
      } finally {
        if (!abortRef.current) setAiThinking(false);
      }
    };

    playCpuMove();

    return () => {
      abortRef.current = true;
    };
  }, [game, isPlayerTurn, aiThinking, playerColor]);

  const handleReset = useCallback(() => {
    abortRef.current = true;
    getEngine().cancelSearch();
    setGame(createGame());
    setMessage(null);
    setAiThinking(false);
  }, []);

  const checkSquare = game.isCheck ? findKingSquare(game, game.turn) : null;

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-1">ebishogi</h1>
      <p className="text-zinc-400 mb-6 text-sm">
        AI-assisted shogi learning
      </p>

      <ShogiBoard
        position={game.position}
        orientation={playerColor}
        arrows={arrows}
        onMove={handleMove}
        lastMove={game.lastMove}
        interactive={isPlayerTurn && !game.isEnd}
        checkSquare={checkSquare ?? undefined}
      />

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
          <span>
            {game.turn === "sente" ? "先手" : "後手"}の番
          </span>
          <span>手数: {game.moveCount}</span>
          {!engineReady && (
            <span className="text-amber-400 animate-pulse">
              AIエンジン読込中...
            </span>
          )}
          {aiThinking && engineReady && (
            <span className="text-sky-400 animate-pulse">
              CPU思考中...
            </span>
          )}
        </div>

        <button
          onClick={handleReset}
          className="mt-2 px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
          type="button"
        >
          新しい対局
        </button>
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
