/**
 * 詰将棋盤面のクリック判定。盤のマス・持ち駒・成りダイアログのみを対象とする。
 */
import type { Color, Role, Square } from "shogiops/types";
import type { Shogi } from "shogiops/variant/shogi";
import { getHandPieces } from "@/lib/shogi-game";
import { type TsumeLayout, type Rect, handSlotPositions } from "./tsume-layout";
import { promotionButtons } from "./tsume-renderer";

export type TsumeHit =
  | { type: "square"; file: number; rank: number }
  | { type: "hand"; role: Role }
  | { type: "promotion"; promote: boolean };

export type TsumeHitState = {
  position: Shogi;
  showPromotion: { from: Square; to: Square } | null;
};

export function hitTestTsume(
  layout: TsumeLayout,
  x: number,
  y: number,
  state: TsumeHitState,
): TsumeHit | null {
  if (state.showPromotion) {
    const { promote, decline } = promotionButtons(layout);
    if (inRect(x, y, promote)) return { type: "promotion", promote: true };
    if (inRect(x, y, decline)) return { type: "promotion", promote: false };
    return null;
  }

  const { board, cell } = layout;
  if (inRect(x, y, board)) {
    const col = Math.floor((x - board.x) / cell);
    const row = Math.floor((y - board.y) / cell);
    const file = 9 - col;
    const rank = row + 1;
    if (file >= 1 && file <= 9 && rank >= 1 && rank <= 9) {
      return { type: "square", file, rank };
    }
  }

  const bottom = hitHand(layout, x, y, state.position, "sente", true);
  if (bottom) return bottom;
  const top = hitHand(layout, x, y, state.position, "gote", false);
  if (top) return top;

  return null;
}

function hitHand(
  layout: TsumeLayout,
  x: number,
  y: number,
  position: Shogi,
  color: Color,
  isBottom: boolean,
): TsumeHit | null {
  const rect = isBottom ? layout.bottomHand : layout.topHand;
  if (!inRect(x, y, rect)) return null;
  const pieces = getHandPieces(position, color);
  const slots = handSlotPositions(rect, pieces, layout.handPieceSize, isBottom);
  for (const slot of slots) {
    if (x >= slot.x && x < slot.x + slot.w) {
      return { type: "hand", role: slot.role };
    }
  }
  return null;
}

function inRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}
