"use client";

import { useState, useCallback } from "react";
import { createInitialPosition, applyMove } from "@ebishogi/shogi-core";
import type { Move, Position } from "@ebishogi/shogi-core";
import { ShogiBoard } from "@/components/board";
import type { ArrowData } from "@/components/board";

export default function Home() {
  const [position, setPosition] = useState<Position>(createInitialPosition);
  const [lastMove, setLastMove] = useState<{ from?: { file: number; rank: number }; to: { file: number; rank: number } } | undefined>();

  const handleMove = useCallback((move: Move) => {
    try {
      const newPosition = applyMove(position, move);
      setPosition(newPosition);
      setLastMove(
        move.type === "board"
          ? { from: move.from, to: move.to }
          : { to: move.to },
      );
    } catch {
      // invalid move
    }
  }, [position]);

  const demoArrows: ArrowData[] = [
    { from: { file: 7, rank: 7 }, to: { file: 7, rank: 6 }, color: "#d4af37", opacity: 0.8, width: 4 },
    { from: { file: 3, rank: 7 }, to: { file: 3, rank: 6 }, color: "#c0c0c0", opacity: 0.5, width: 3 },
    { from: { file: 2, rank: 8 }, to: { file: 6, rank: 4 }, color: "#a08060", opacity: 0.3, width: 2 },
  ];

  const handleReset = useCallback(() => {
    setPosition(createInitialPosition());
    setLastMove(undefined);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-2">ebishogi</h1>
      <p className="text-zinc-400 mb-8">AI-assisted shogi learning</p>

      <ShogiBoard
        position={position}
        onMove={handleMove}
        lastMove={lastMove}
        arrows={position.moveCount === 1 ? demoArrows : []}
      />

      <div className="mt-6 flex gap-4">
        <div className="text-sm text-zinc-400">
          {position.turn === "sente" ? "先手" : "後手"}の番 | 手数: {position.moveCount}
        </div>
        <button
          onClick={handleReset}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          type="button"
        >
          リセット
        </button>
      </div>
    </div>
  );
}
