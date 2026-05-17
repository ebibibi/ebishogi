"use client";

import type { Color, Role } from "shogiops/types";
import { PieceSVG } from "./PieceSVG";

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
  horizontal?: boolean;
  flipped?: boolean;
  playerName?: string;
  timer?: string;
  isBottom?: boolean;
};

export function HandPanel({
  pieces,
  color,
  isActive,
  selectedDrop,
  onPieceClick,
  cellSize = 48,
  horizontal = false,
  flipped = false,
  playerName,
  timer,
  isBottom = false,
}: Props) {
  const hasPieces = pieces.size > 0;

  if (horizontal) {
    const handPieceSize = Math.max(18, Math.floor(cellSize * 0.55));

    const playerInfo = (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-bold text-zinc-300 bg-zinc-700 px-1.5 py-0.5 rounded">
          {playerName ?? (color === "sente" ? "☗" : "☖")}
        </span>
        {timer !== undefined && (
          <span
            className={`text-sm font-mono tabular-nums font-bold ${
              isActive ? "text-amber-400" : "text-zinc-500"
            }`}
          >
            {timer}
          </span>
        )}
      </div>
    );

    const piecesSection = (
      <div className="flex items-center gap-0.5">
        {hasPieces ? (
          HAND_ORDER.map((role) => {
            const count = pieces.get(role);
            if (!count) return null;
            const isSelected = selectedDrop === role;
            return (
              <button
                key={role}
                className={`relative flex items-center justify-center rounded transition-all ${
                  isSelected
                    ? "ring-2 ring-amber-400 bg-amber-600/30"
                    : isActive
                      ? "hover:bg-zinc-600/50"
                      : ""
                } ${isActive ? "cursor-pointer" : "cursor-default opacity-60"}`}
                style={{ width: handPieceSize + 6, height: handPieceSize + 4 }}
                onClick={() => isActive && onPieceClick(role)}
                type="button"
                disabled={!isActive}
              >
                <PieceSVG
                  piece={{ role, color }}
                  flipped={flipped}
                  size={handPieceSize}
                />
                {count > 1 && (
                  <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold text-white bg-red-600 rounded-full min-w-[14px] h-[14px] flex items-center justify-center leading-none px-0.5">
                    {count}
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <span className="text-[10px] text-zinc-600 px-1">-</span>
        )}
      </div>
    );

    return (
      <div
        className={`flex items-center w-full px-2 py-0.5 rounded ${
          isActive
            ? "bg-zinc-800/90 ring-1 ring-amber-500/30"
            : "bg-zinc-800/60"
        }`}
      >
        {isBottom ? (
          <>
            {piecesSection}
            <div className="ml-auto">{playerInfo}</div>
          </>
        ) : (
          <>
            {playerInfo}
            <div className="ml-auto">{piecesSection}</div>
          </>
        )}
      </div>
    );
  }

  const handPieceSize = Math.max(24, Math.floor(cellSize * 0.5));

  return (
    <div
      className={`
        flex flex-col items-center gap-1 p-2 rounded-lg
        ${isActive ? "bg-zinc-700/80 ring-2 ring-amber-500/40" : "bg-zinc-800/60"}
      `}
      style={{ minWidth: handPieceSize + 24 }}
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
                relative flex items-center justify-center rounded
                transition-colors duration-100
                ${isSelected ? "bg-amber-600/40 ring-1 ring-amber-400" : "hover:bg-zinc-600/50"}
                ${isActive ? "cursor-pointer" : "cursor-default opacity-60"}
              `}
              style={{ width: handPieceSize + 12, height: handPieceSize + 8 }}
              onClick={() => isActive && onPieceClick(role)}
              type="button"
              disabled={!isActive}
            >
              <PieceSVG
                piece={{ role, color }}
                flipped={flipped}
                size={handPieceSize}
              />
              {count > 1 && (
                <span className="absolute -bottom-0.5 -right-0.5 text-[10px] font-bold text-white bg-red-600 rounded-full min-w-[16px] h-[16px] flex items-center justify-center leading-none px-0.5">
                  {count}
                </span>
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
