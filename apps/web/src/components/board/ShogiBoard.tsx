"use client";

import { useState, useCallback } from "react";
import type { MoveOrDrop, Square, Color, Role, Piece } from "shogiops/types";
import type { Shogi } from "shogiops/variant/shogi";
import {
  squareToCoords,
  coordsToSquare,
  canPromote,
  mustPromote,
  getHandPieces,
} from "@/lib/shogi-game";
import { PieceSVG } from "./PieceSVG";
import { HandPanel } from "./HandPanel";
import { Arrow } from "./Arrow";
import { CaptureEffect } from "./CaptureEffect";

export type ArrowData = {
  fromFile: number;
  fromRank: number;
  toFile: number;
  toRank: number;
  color: string;
  opacity: number;
  width: number;
};

type Props = {
  position: Shogi;
  orientation?: Color;
  arrows?: readonly ArrowData[];
  lastMove?: MoveOrDrop | null;
  onMove?: (move: MoveOrDrop) => void;
  interactive?: boolean;
  checkSquare?: Square | null;
  moveCount?: number;
  captureSquare?: { file: number; rank: number } | null;
  captureTrigger?: number;
  cellSize?: number;
};

export function ShogiBoard({
  position,
  orientation = "sente",
  arrows = [],
  lastMove,
  onMove,
  interactive = true,
  checkSquare,
  moveCount = 0,
  captureSquare,
  captureTrigger = 0,
  cellSize = 48,
}: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<Role | null>(null);
  const [legalDests, setLegalDests] = useState<Set<number>>(new Set());
  const [showPromotion, setShowPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const flipped = orientation === "gote";

  const boardPx = cellSize * 9;
  const labelW = Math.max(20, Math.floor(cellSize * 0.45));
  const pieceSize = Math.floor(cellSize * 0.92);
  const dotSize = Math.max(10, Math.floor(cellSize * 0.3));

  const handleSquareClick = useCallback(
    (file: number, rank: number) => {
      if (!interactive || !onMove) return;
      const sq = coordsToSquare(file, rank);

      if (showPromotion) {
        setShowPromotion(null);
        return;
      }

      if (selectedDrop) {
        const piece: Piece = { role: selectedDrop, color: position.turn };
        const dests = position.dropDests(piece);
        if (dests.has(sq)) {
          onMove({ role: selectedDrop, to: sq });
        }
        setSelectedDrop(null);
        setLegalDests(new Set());
        return;
      }

      if (selected !== null) {
        if (legalDests.has(sq)) {
          if (
            canPromote(position, selected, sq) &&
            !mustPromote(position, selected, sq)
          ) {
            setShowPromotion({ from: selected, to: sq });
            return;
          }
          const promote = mustPromote(position, selected, sq);
          onMove({ from: selected, to: sq, promotion: promote || undefined });
          setSelected(null);
          setLegalDests(new Set());
          return;
        }
        setSelected(null);
        setLegalDests(new Set());
      }

      const piece = position.board.get(sq);
      if (piece && piece.color === position.turn) {
        setSelected(sq);
        const dests = position.moveDests(sq);
        const destSet = new Set<number>();
        for (const d of dests) destSet.add(d);
        setLegalDests(destSet);
      }
    },
    [
      interactive,
      onMove,
      position,
      selected,
      selectedDrop,
      legalDests,
      showPromotion,
    ],
  );

  const handlePromotion = useCallback(
    (promote: boolean) => {
      if (!showPromotion || !onMove) return;
      onMove({
        from: showPromotion.from,
        to: showPromotion.to,
        promotion: promote || undefined,
      });
      setShowPromotion(null);
      setSelected(null);
      setLegalDests(new Set());
    },
    [showPromotion, onMove],
  );

  const handleHandClick = useCallback(
    (role: Role) => {
      if (!interactive || !onMove) return;
      setSelected(null);
      setSelectedDrop(role);
      const piece: Piece = { role, color: position.turn };
      const dests = position.dropDests(piece);
      const destSet = new Set<number>();
      for (const d of dests) destSet.add(d);
      setLegalDests(destSet);
    },
    [interactive, onMove, position],
  );

  const files = flipped
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9]
    : [9, 8, 7, 6, 5, 4, 3, 2, 1];
  const ranks = flipped
    ? [9, 8, 7, 6, 5, 4, 3, 2, 1]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const lastMoveSquares = getLastMoveSquares(lastMove);
  const lastMoveTo = lastMove ? lastMove.to : -1;
  const topColor = flipped ? "sente" : "gote";
  const bottomColor = flipped ? "gote" : "sente";

  return (
    <div className="flex items-center gap-3 relative">
      <HandPanel
        pieces={getHandPieces(position, topColor)}
        color={topColor}
        isActive={position.turn === topColor}
        selectedDrop={position.turn === topColor ? selectedDrop : null}
        onPieceClick={handleHandClick}
        cellSize={cellSize}
      />

      <div className="relative">
        <div className="flex mb-1">
          <div style={{ width: labelW }} />
          {files.map((f) => (
            <div
              key={f}
              style={{ width: cellSize }}
              className="text-center text-xs text-zinc-500 font-mono"
            >
              {f}
            </div>
          ))}
        </div>

        <div className="flex">
          <div className="flex flex-col">
            {ranks.map((r) => (
              <div
                key={r}
                style={{ width: labelW, height: cellSize }}
                className="flex items-center justify-center text-xs text-zinc-500"
              >
                {rankKanji(r)}
              </div>
            ))}
          </div>

          <div
            className="relative shadow-xl rounded-sm"
            style={{
              border: "2px solid #8B6914",
              backgroundColor: "#D4A050",
              backgroundImage: [
                "repeating-linear-gradient(90deg, transparent, rgba(139,115,85,0.08) 1px, transparent 2px, transparent 11px)",
                "repeating-linear-gradient(88deg, transparent, rgba(130,100,50,0.05) 0.5px, transparent 1.5px, transparent 23px)",
                "repeating-linear-gradient(92deg, transparent 0px, rgba(160,120,60,0.04) 0.5px, transparent 1px, transparent 37px)",
                "repeating-linear-gradient(0deg, transparent, rgba(140,110,60,0.025) 0.5px, transparent 1px, transparent 48px)",
                "linear-gradient(176deg, rgba(255,220,140,0.10) 0%, transparent 25%, rgba(120,85,30,0.06) 55%, transparent 85%)",
                "radial-gradient(ellipse at 45% 40%, rgba(255,210,120,0.07) 0%, transparent 60%)",
              ].join(","),
            }}
          >
            <div
              className="grid grid-cols-9"
              style={{ width: boardPx, height: boardPx }}
            >
              {ranks.map((rank) =>
                files.map((file) => {
                  const sq = coordsToSquare(file, rank);
                  const piece = position.board.get(sq);
                  const isSelected = selected === sq;
                  const isLegalDest = legalDests.has(sq);
                  const isLastMove = lastMoveSquares.has(sq);
                  const isLastMovedTo = sq === lastMoveTo;
                  const isCheckSq = checkSquare === sq;

                  return (
                    <button
                      key={`${file}-${rank}`}
                      style={{ width: cellSize, height: cellSize }}
                      className={`
                        border border-amber-800/25 flex items-center justify-center
                        relative transition-all duration-100
                        ${isSelected ? "bg-sky-400/25 ring-2 ring-sky-400/60 z-10" : ""}
                        ${isLastMove && !isSelected ? "bg-amber-500/20" : ""}
                        ${isCheckSq ? "bg-red-500/30 ring-2 ring-red-500/60 z-10" : ""}
                        ${interactive ? "cursor-pointer hover:bg-white/10" : ""}
                      `}
                      onClick={() => handleSquareClick(file, rank)}
                      type="button"
                    >
                      {isLegalDest && !piece && (
                        <div
                          className="absolute bg-sky-500/35 rounded-full"
                          style={{ width: dotSize, height: dotSize }}
                        />
                      )}
                      {isLegalDest && piece && (
                        <div className="absolute inset-0.5 ring-2 ring-sky-500/50 ring-inset rounded-sm" />
                      )}
                      {piece && (
                        <PieceSVG
                          key={
                            isLastMovedTo
                              ? `m${moveCount}`
                              : `s${file}-${rank}`
                          }
                          piece={piece}
                          flipped={flipped}
                          isSelected={isSelected}
                          animate={isLastMovedTo}
                          size={pieceSize}
                        />
                      )}
                    </button>
                  );
                }),
              )}
            </div>

            <svg
              className="absolute inset-0 pointer-events-none"
              viewBox={`0 0 ${boardPx} ${boardPx}`}
              width={boardPx}
              height={boardPx}
            >
              {arrows.map((arrow, i) => {
                const from = fileRankToPixel(
                  arrow.fromFile,
                  arrow.fromRank,
                  flipped,
                  cellSize,
                );
                const to = fileRankToPixel(
                  arrow.toFile,
                  arrow.toRank,
                  flipped,
                  cellSize,
                );
                return (
                  <Arrow
                    key={i}
                    from={from}
                    to={to}
                    color={arrow.color}
                    opacity={arrow.opacity}
                    width={arrow.width}
                  />
                );
              })}
            </svg>

            {captureSquare && captureTrigger > 0 && (
              <CaptureEffect
                file={captureSquare.file}
                rank={captureSquare.rank}
                flipped={flipped}
                trigger={captureTrigger}
                cellSize={cellSize}
              />
            )}
          </div>
        </div>
      </div>

      <HandPanel
        pieces={getHandPieces(position, bottomColor)}
        color={bottomColor}
        isActive={position.turn === bottomColor}
        selectedDrop={position.turn === bottomColor ? selectedDrop : null}
        onPieceClick={handleHandClick}
        cellSize={cellSize}
      />

      {showPromotion && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-black/70 absolute inset-0" />
          <div className="relative bg-zinc-800 rounded-xl shadow-2xl p-6 flex flex-col gap-4 border border-zinc-700">
            <p className="text-zinc-200 font-bold text-center">成りますか？</p>
            <div className="flex gap-4">
              <button
                onClick={() => handlePromotion(true)}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-700 transition-colors"
                type="button"
              >
                成る
              </button>
              <button
                onClick={() => handlePromotion(false)}
                className="px-6 py-3 bg-zinc-600 text-white rounded-lg font-bold text-lg hover:bg-zinc-500 transition-colors"
                type="button"
              >
                不成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fileRankToPixel(
  file: number,
  rank: number,
  flipped: boolean,
  cellSize: number,
): { x: number; y: number } {
  const col = flipped ? file - 1 : 9 - file;
  const row = flipped ? 9 - rank : rank - 1;
  return { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 };
}

function rankKanji(rank: number): string {
  return ["一", "二", "三", "四", "五", "六", "七", "八", "九"][rank - 1] ?? "";
}

function getLastMoveSquares(
  lastMove: MoveOrDrop | null | undefined,
): Set<number> {
  const s = new Set<number>();
  if (!lastMove) return s;
  if ("from" in lastMove) s.add(lastMove.from);
  s.add(lastMove.to);
  return s;
}
