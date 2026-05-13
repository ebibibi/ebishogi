"use client";

import { useState, useCallback } from "react";
import type { Position, Square, Move, Piece, Color, PieceType, AnyPieceType } from "@ebishogi/shogi-core";
import { getPiece, PIECE_KANJI, BOARD_SIZE } from "@ebishogi/shogi-core";
import { HandPanel } from "./HandPanel";
import { Arrow } from "./Arrow";

export type ArrowData = {
  from: Square;
  to: Square;
  color: string;
  opacity: number;
  width: number;
};

type ShogiBoardProps = {
  position: Position;
  orientation?: Color;
  arrows?: readonly ArrowData[];
  lastMove?: { from?: Square; to: Square };
  onMove?: (move: Move) => void;
  interactive?: boolean;
};

export function ShogiBoard({
  position,
  orientation = "sente",
  arrows = [],
  lastMove,
  onMove,
  interactive = true,
}: ShogiBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<PieceType | null>(null);
  const flipped = orientation === "gote";

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!interactive || !onMove) return;

      if (selectedDrop) {
        const piece = getPiece(position, square);
        if (!piece) {
          onMove({ type: "drop", pieceType: selectedDrop, to: square });
          setSelectedDrop(null);
        }
        return;
      }

      if (selectedSquare) {
        const piece = getPiece(position, selectedSquare);
        if (piece && piece.color === position.turn) {
          const target = getPiece(position, square);
          if (!target || target.color !== position.turn) {
            const canPromote = shouldPrompt(piece.pieceType, selectedSquare, square, position.turn);
            const mustPromote = mustForcePromote(piece.pieceType, square, position.turn);

            if (mustPromote) {
              onMove({ type: "board", from: selectedSquare, to: square, promote: true });
            } else if (canPromote) {
              onMove({ type: "board", from: selectedSquare, to: square, promote: true });
            } else {
              onMove({ type: "board", from: selectedSquare, to: square, promote: false });
            }
            setSelectedSquare(null);
            return;
          }
        }
        setSelectedSquare(null);
      }

      const piece = getPiece(position, square);
      if (piece && piece.color === position.turn) {
        setSelectedSquare(square);
      }
    },
    [interactive, onMove, position, selectedSquare, selectedDrop],
  );

  const handleHandClick = useCallback(
    (pieceType: PieceType) => {
      if (!interactive || !onMove) return;
      setSelectedSquare(null);
      setSelectedDrop(pieceType);
    },
    [interactive, onMove],
  );

  const files = flipped ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [9, 8, 7, 6, 5, 4, 3, 2, 1];
  const ranks = flipped ? [9, 8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="flex items-center gap-4">
      <HandPanel
        hand={position.hands[flipped ? "sente" : "gote"]}
        color={flipped ? "sente" : "gote"}
        isActive={position.turn === (flipped ? "sente" : "gote")}
        selectedDrop={selectedDrop}
        onPieceClick={handleHandClick}
      />

      <div className="relative">
        {/* File labels */}
        <div className="flex mb-1">
          <div className="w-6" />
          {files.map((f) => (
            <div key={f} className="w-12 text-center text-sm text-gray-500">
              {f}
            </div>
          ))}
        </div>

        <div className="flex">
          {/* Rank labels (left side is unnecessary for standard notation) */}
          <div className="flex flex-col">
            {ranks.map((r) => (
              <div key={r} className="w-6 h-12 flex items-center justify-center text-sm text-gray-500">
                {rankToKanji(r)}
              </div>
            ))}
          </div>

          {/* Board grid */}
          <div className="relative border-2 border-gray-800 bg-amber-200">
            <div className="grid grid-cols-9">
              {ranks.map((rank) =>
                files.map((file) => {
                  const square: Square = { file, rank };
                  const piece = getPiece(position, square);
                  const isSelected =
                    selectedSquare?.file === file && selectedSquare?.rank === rank;
                  const isLastMoveFrom =
                    lastMove?.from?.file === file && lastMove?.from?.rank === rank;
                  const isLastMoveTo =
                    lastMove?.to.file === file && lastMove?.to.rank === rank;
                  const isDropTarget =
                    selectedDrop !== null && !piece;

                  return (
                    <button
                      key={`${file}-${rank}`}
                      className={`
                        w-12 h-12 border border-gray-600/30 flex items-center justify-center
                        relative transition-colors duration-100
                        ${isSelected ? "bg-blue-300/60" : ""}
                        ${isLastMoveFrom || isLastMoveTo ? "bg-yellow-300/40" : ""}
                        ${isDropTarget ? "bg-green-200/30" : ""}
                        ${interactive ? "cursor-pointer hover:bg-blue-100/40" : ""}
                      `}
                      onClick={() => handleSquareClick(square)}
                      type="button"
                    >
                      {piece && (
                        <PieceDisplay piece={piece} flipped={flipped} />
                      )}
                    </button>
                  );
                }),
              )}
            </div>

            {/* SVG arrow overlay */}
            <svg
              className="absolute inset-0 pointer-events-none"
              viewBox={`0 0 ${BOARD_SIZE * 48} ${BOARD_SIZE * 48}`}
              width={BOARD_SIZE * 48}
              height={BOARD_SIZE * 48}
            >
              {arrows.map((arrow, i) => (
                <Arrow
                  key={i}
                  from={squareToPixel(arrow.from, flipped)}
                  to={squareToPixel(arrow.to, flipped)}
                  color={arrow.color}
                  opacity={arrow.opacity}
                  width={arrow.width}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>

      <HandPanel
        hand={position.hands[flipped ? "gote" : "sente"]}
        color={flipped ? "gote" : "sente"}
        isActive={position.turn === (flipped ? "gote" : "sente")}
        selectedDrop={selectedDrop}
        onPieceClick={handleHandClick}
      />
    </div>
  );
}

function PieceDisplay({ piece, flipped }: { piece: Piece; flipped: boolean }) {
  const isGote = piece.color === "gote";
  const rotate = flipped ? !isGote : isGote;

  return (
    <span
      className={`
        text-lg font-bold select-none
        ${rotate ? "rotate-180" : ""}
        ${isGote ? "text-gray-700" : "text-gray-900"}
      `}
    >
      {PIECE_KANJI[piece.pieceType]}
    </span>
  );
}

function squareToPixel(
  square: Square,
  flipped: boolean,
): { x: number; y: number } {
  const col = flipped ? square.file - 1 : 9 - square.file;
  const row = flipped ? 9 - square.rank : square.rank - 1;
  return { x: col * 48 + 24, y: row * 48 + 24 };
}

function rankToKanji(rank: number): string {
  const kanji = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
  return kanji[rank - 1] ?? "";
}

function shouldPrompt(
  pieceType: AnyPieceType,
  from: Square,
  to: Square,
  turn: Color,
): boolean {
  const nonPromotable = ["king", "gold"] as const;
  if ((nonPromotable as readonly string[]).includes(pieceType)) return false;
  if (pieceType.startsWith("promoted")) return false;

  if (turn === "sente") {
    return from.rank <= 3 || to.rank <= 3;
  }
  return from.rank >= 7 || to.rank >= 7;
}

function mustForcePromote(
  pieceType: AnyPieceType,
  to: Square,
  turn: Color,
): boolean {
  if (turn === "sente") {
    if (pieceType === "pawn" || pieceType === "lance") return to.rank === 1;
    if (pieceType === "knight") return to.rank <= 2;
  } else {
    if (pieceType === "pawn" || pieceType === "lance") return to.rank === 9;
    if (pieceType === "knight") return to.rank >= 8;
  }
  return false;
}
