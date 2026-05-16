"use client";

import type { Piece } from "shogiops/types";

const PIECE_IMAGE: Record<string, string> = {
  king: "/pieces/king.png",
  rook: "/pieces/rook.png",
  bishop: "/pieces/bishop.png",
  gold: "/pieces/gold.png",
  silver: "/pieces/silver.png",
  knight: "/pieces/knight.png",
  lance: "/pieces/lance.png",
  pawn: "/pieces/pawn.png",
  dragon: "/pieces/dragon.png",
  horse: "/pieces/horse.png",
  promotedsilver: "/pieces/promotedsilver.png",
  promotedknight: "/pieces/promotedknight.png",
  promotedlance: "/pieces/promotedlance.png",
  tokin: "/pieces/tokin.png",
};

type Props = {
  piece: Piece;
  flipped: boolean;
  isSelected?: boolean;
  animate?: boolean;
};

export function PieceSVG({ piece, flipped, isSelected, animate }: Props) {
  const isGote = piece.color === "gote";
  const rotate = flipped ? !isGote : isGote;
  const src = PIECE_IMAGE[piece.role] ?? PIECE_IMAGE.pawn;

  return (
    <img
      src={src}
      alt={piece.role}
      draggable={false}
      className={`w-[44px] h-[44px] object-contain pointer-events-none transition-transform duration-150 ${
        isSelected ? "scale-110 brightness-110" : ""
      } ${animate ? "animate-piece-place" : ""}`}
      style={{
        transform: rotate ? "rotate(180deg)" : undefined,
        filter: isSelected
          ? "drop-shadow(0 2px 6px rgba(212,175,55,0.6))"
          : "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
      }}
    />
  );
}
