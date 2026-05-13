"use client";

import { useState, useCallback } from "react";
import type { MoveOrDrop, Square, Color, Role, Piece } from "shogiops/types";
import { squareFile, squareRank } from "shogiops/util";
import type { Shogi } from "shogiops/variant/shogi";
import {
  squareToCoords,
  coordsToSquare,
  canPromote,
  mustPromote,
  getHandPieces,
} from "@/lib/shogi-game";
import { HandPanel } from "./HandPanel";
import { Arrow } from "./Arrow";

export type ArrowData = {
  fromFile: number;
  fromRank: number;
  toFile: number;
  toRank: number;
  color: string;
  opacity: number;
  width: number;
};

const ROLE_KANJI: Record<string, string> = {
  king: "玉", rook: "飛", bishop: "角", gold: "金",
  silver: "銀", knight: "桂", lance: "香", pawn: "歩",
  dragon: "龍", horse: "馬",
  promotedsilver: "全", promotedknight: "圭",
  promotedlance: "杏", tokin: "と",
};

type Props = {
  position: Shogi;
  orientation?: Color;
  arrows?: readonly ArrowData[];
  lastMove?: MoveOrDrop | null;
  onMove?: (move: MoveOrDrop) => void;
  interactive?: boolean;
  checkSquare?: Square | null;
};

export function ShogiBoard({
  position,
  orientation = "sente",
  arrows = [],
  lastMove,
  onMove,
  interactive = true,
  checkSquare,
}: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<Role | null>(null);
  const [legalDests, setLegalDests] = useState<Set<number>>(new Set());
  const [showPromotion, setShowPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const flipped = orientation === "gote";

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
    [interactive, onMove, position, selected, selectedDrop, legalDests, showPromotion],
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
  const topColor = flipped ? "sente" : "gote";
  const bottomColor = flipped ? "gote" : "sente";

  return (
    <div className="flex items-center gap-4 relative">
      <HandPanel
        pieces={getHandPieces(position, topColor)}
        color={topColor}
        isActive={position.turn === topColor}
        selectedDrop={position.turn === topColor ? selectedDrop : null}
        onPieceClick={handleHandClick}
      />

      <div className="relative">
        <div className="flex mb-1">
          <div className="w-6" />
          {files.map((f) => (
            <div
              key={f}
              className="w-12 text-center text-sm text-gray-400"
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
                className="w-6 h-12 flex items-center justify-center text-sm text-gray-400"
              >
                {rankKanji(r)}
              </div>
            ))}
          </div>

          <div className="relative border-2 border-amber-900 bg-amber-200 shadow-lg">
            <div className="grid grid-cols-9">
              {ranks.map((rank) =>
                files.map((file) => {
                  const sq = coordsToSquare(file, rank);
                  const piece = position.board.get(sq);
                  const isSelected = selected === sq;
                  const isLegalDest = legalDests.has(sq);
                  const isLastMove = lastMoveSquares.has(sq);
                  const isCheckSq = checkSquare === sq;

                  return (
                    <button
                      key={`${file}-${rank}`}
                      className={`
                        w-12 h-12 border border-amber-700/20 flex items-center justify-center
                        relative transition-all duration-100
                        ${isSelected ? "bg-sky-300/50 ring-2 ring-sky-400" : ""}
                        ${isLastMove && !isSelected ? "bg-amber-400/40" : ""}
                        ${isCheckSq ? "bg-red-400/50 ring-2 ring-red-500" : ""}
                        ${interactive ? "cursor-pointer hover:bg-sky-100/30" : ""}
                      `}
                      onClick={() => handleSquareClick(file, rank)}
                      type="button"
                    >
                      {isLegalDest && !piece && (
                        <div className="absolute w-3 h-3 bg-sky-500/40 rounded-full" />
                      )}
                      {isLegalDest && piece && (
                        <div className="absolute inset-0 ring-2 ring-sky-500/50 ring-inset rounded-sm" />
                      )}
                      {piece && (
                        <PieceDisplay piece={piece} flipped={flipped} />
                      )}
                    </button>
                  );
                }),
              )}
            </div>

            <svg
              className="absolute inset-0 pointer-events-none"
              viewBox="0 0 432 432"
              width={432}
              height={432}
            >
              {arrows.map((arrow, i) => {
                const from = fileRankToPixel(
                  arrow.fromFile,
                  arrow.fromRank,
                  flipped,
                );
                const to = fileRankToPixel(
                  arrow.toFile,
                  arrow.toRank,
                  flipped,
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
          </div>
        </div>
      </div>

      <HandPanel
        pieces={getHandPieces(position, bottomColor)}
        color={bottomColor}
        isActive={position.turn === bottomColor}
        selectedDrop={position.turn === bottomColor ? selectedDrop : null}
        onPieceClick={handleHandClick}
      />

      {showPromotion && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-gray-900/80 absolute inset-0" />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 flex flex-col gap-4">
            <p className="text-gray-800 font-bold text-center">成りますか？</p>
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
                className="px-6 py-3 bg-gray-600 text-white rounded-lg font-bold text-lg hover:bg-gray-700 transition-colors"
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

function PieceDisplay({ piece, flipped }: { piece: Piece; flipped: boolean }) {
  const isGote = piece.color === "gote";
  const rotate = flipped ? !isGote : isGote;
  const isPromoted = [
    "dragon",
    "horse",
    "tokin",
    "promotedsilver",
    "promotedknight",
    "promotedlance",
  ].includes(piece.role);

  return (
    <span
      className={`
        text-lg font-bold select-none leading-none
        ${rotate ? "rotate-180" : ""}
        ${isPromoted ? "text-red-700" : "text-gray-900"}
      `}
    >
      {ROLE_KANJI[piece.role] ?? piece.role}
    </span>
  );
}

function fileRankToPixel(
  file: number,
  rank: number,
  flipped: boolean,
): { x: number; y: number } {
  const col = flipped ? file - 1 : 9 - file;
  const row = flipped ? 9 - rank : rank - 1;
  return { x: col * 48 + 24, y: row * 48 + 24 };
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
