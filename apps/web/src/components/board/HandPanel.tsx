"use client";

import type { Color, Role } from "shogiops/types";

const ROLE_KANJI: Record<string, string> = {
  rook: "飛",
  bishop: "角",
  gold: "金",
  silver: "銀",
  knight: "桂",
  lance: "香",
  pawn: "歩",
};

const HAND_ORDER: Role[] = [
  "rook",
  "bishop",
  "gold",
  "silver",
  "knight",
  "lance",
  "pawn",
];

type Props = {
  pieces: Map<Role, number>;
  color: Color;
  isActive: boolean;
  selectedDrop: Role | null;
  onPieceClick: (role: Role) => void;
  cellSize?: number;
};

export function HandPanel({
  pieces,
  color,
  isActive,
  selectedDrop,
  onPieceClick,
  cellSize = 48,
}: Props) {
  const hasPieces = pieces.size > 0;
  const large = cellSize >= 64;
  const textSize = large ? "text-base" : "text-sm";
  const kanjiSize = large ? "text-lg" : "text-base";
  const padX = large ? "px-3" : "px-2";
  const padY = large ? "py-1.5" : "py-1";

  return (
    <div
      className={`
        flex flex-col gap-1 p-2 rounded-lg
        ${isActive ? "bg-zinc-700/80 ring-2 ring-amber-500/40" : "bg-zinc-800/60"}
      `}
      style={{ minWidth: large ? 72 : 64 }}
    >
      <div className="text-xs text-center text-zinc-400 mb-1">
        {color === "sente" ? "☗先手" : "☖後手"}
      </div>
      {hasPieces ? (
        HAND_ORDER.map((role) => {
          const count = pieces.get(role);
          if (!count) return null;
          const isSelected = selectedDrop === role;
          return (
            <button
              key={role}
              className={`
                flex items-center gap-1 ${padX} ${padY} rounded ${textSize}
                transition-colors duration-100
                ${isSelected ? "bg-amber-600/40 ring-1 ring-amber-400" : "hover:bg-zinc-600/50"}
                ${isActive ? "cursor-pointer text-zinc-200" : "cursor-default text-zinc-500"}
              `}
              onClick={() => isActive && onPieceClick(role)}
              type="button"
              disabled={!isActive}
            >
              <span className={`font-bold ${kanjiSize}`}>{ROLE_KANJI[role] ?? role}</span>
              {count > 1 && (
                <span className="text-xs text-zinc-400">{count}</span>
              )}
            </button>
          );
        })
      ) : (
        <div className="text-xs text-zinc-500 text-center py-4">-</div>
      )}
    </div>
  );
}
