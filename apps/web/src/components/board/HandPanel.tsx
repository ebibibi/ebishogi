import type { Color, Hand, PieceType } from "@ebishogi/shogi-core";
import { PIECE_KANJI } from "@ebishogi/shogi-core";

const HAND_ORDER: PieceType[] = [
  "rook",
  "bishop",
  "gold",
  "silver",
  "knight",
  "lance",
  "pawn",
];

type HandPanelProps = {
  hand: Hand;
  color: Color;
  isActive: boolean;
  selectedDrop: PieceType | null;
  onPieceClick: (pieceType: PieceType) => void;
};

export function HandPanel({
  hand,
  color,
  isActive,
  selectedDrop,
  onPieceClick,
}: HandPanelProps) {
  const hasPieces = HAND_ORDER.some((pt) => hand[pt] > 0);

  return (
    <div
      className={`
        flex flex-col gap-1 p-2 rounded-lg min-w-16
        ${isActive ? "bg-blue-50 ring-2 ring-blue-300" : "bg-gray-50"}
      `}
    >
      <div className="text-xs text-center text-gray-500 mb-1">
        {color === "sente" ? "先手" : "後手"}
      </div>
      {hasPieces ? (
        HAND_ORDER.map((pt) => {
          if (hand[pt] <= 0) return null;
          const isSelected = selectedDrop === pt;
          return (
            <button
              key={pt}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-sm
                transition-colors duration-100
                ${isSelected ? "bg-blue-300/60" : "hover:bg-gray-200"}
                ${isActive ? "cursor-pointer" : "cursor-default opacity-60"}
              `}
              onClick={() => isActive && onPieceClick(pt)}
              type="button"
              disabled={!isActive}
            >
              <span className="font-bold">{PIECE_KANJI[pt]}</span>
              {hand[pt] > 1 && (
                <span className="text-xs text-gray-500">{hand[pt]}</span>
              )}
            </button>
          );
        })
      ) : (
        <div className="text-xs text-gray-400 text-center py-4">-</div>
      )}
    </div>
  );
}
