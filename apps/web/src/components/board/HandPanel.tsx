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
};

export function HandPanel({
  pieces,
  color,
  isActive,
  selectedDrop,
  onPieceClick,
}: Props) {
  const hasPieces = pieces.size > 0;

  return (
    <div
      className={`
        flex flex-col gap-1 p-2 rounded-lg min-w-16
        ${isActive ? "bg-zinc-700/80 ring-2 ring-amber-500/40" : "bg-zinc-800/60"}
      `}
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
                flex items-center gap-1 px-2 py-1 rounded text-sm
                transition-colors duration-100
                ${isSelected ? "bg-amber-600/40 ring-1 ring-amber-400" : "hover:bg-zinc-600/50"}
                ${isActive ? "cursor-pointer text-zinc-200" : "cursor-default text-zinc-500"}
              `}
              onClick={() => isActive && onPieceClick(role)}
              type="button"
              disabled={!isActive}
            >
              <span className="font-bold">{ROLE_KANJI[role] ?? role}</span>
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
