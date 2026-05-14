"use client";

import type { Piece } from "shogiops/types";

const ROLE_KANJI: Record<string, string> = {
  king: "玉",
  rook: "飛",
  bishop: "角",
  gold: "金",
  silver: "銀",
  knight: "桂",
  lance: "香",
  pawn: "歩",
  dragon: "龍",
  horse: "馬",
  promotedsilver: "全",
  promotedknight: "圭",
  promotedlance: "杏",
  tokin: "と",
};

const PROMOTED_ROLES = new Set([
  "dragon",
  "horse",
  "tokin",
  "promotedsilver",
  "promotedknight",
  "promotedlance",
]);

type Props = {
  piece: Piece;
  flipped: boolean;
  isSelected?: boolean;
  animate?: boolean;
};

export function PieceSVG({ piece, flipped, isSelected, animate }: Props) {
  const isGote = piece.color === "gote";
  const rotate = flipped ? !isGote : isGote;
  const isPromoted = PROMOTED_ROLES.has(piece.role);
  const kanji = ROLE_KANJI[piece.role] ?? "?";
  const fill = isSelected ? "#F5E0B8" : "#E8D0A8";

  return (
    <svg
      viewBox="0 0 40 46"
      className={`w-[38px] h-[43px] transition-transform duration-150 ${
        isSelected ? "scale-110" : ""
      } ${animate ? "animate-piece-place" : ""}`}
      style={
        isSelected
          ? { filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))" }
          : { filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" }
      }
    >
      <g transform={rotate ? "rotate(180 20 23)" : undefined}>
        <path
          d="M 20 3 L 35 12 L 37 41 Q 37 43.5 34.5 43.5 L 5.5 43.5 Q 3 43.5 3 41 L 5 12 Z"
          fill={fill}
          stroke="#8B7355"
          strokeWidth={1.2}
        />
        <path
          d="M 20 3 L 35 12 L 37 41 Q 37 43.5 34.5 43.5 L 5.5 43.5 Q 3 43.5 3 41 L 5 12 Z"
          fill="url(#)"
          opacity={0}
        />
        <rect x={6} y={4} width={28} height={18} fill="rgba(255,255,255,0.08)" rx={2} />
        <text
          x={20}
          y={30}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={20}
          fontWeight="bold"
          fill={isPromoted ? "#CC0000" : "#1A1A1A"}
          style={{ fontFamily: "'Noto Sans JP', serif", userSelect: "none" }}
        >
          {kanji}
        </text>
      </g>
    </svg>
  );
}
