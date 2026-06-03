import type { Role, Color } from "shogiops/types";
import type { Shogi } from "shogiops/variant/shogi";
import type { CanvasLayout } from "./layout";
import {
  getHandSlotPositions,
  getControlButtons,
  getActionButtons,
  getPromotionButtons,
} from "./layout";
import { getHandPieces } from "@/lib/shogi-game";

export type HitResult =
  | { type: "square"; file: number; rank: number }
  | { type: "hand"; role: Role }
  | { type: "button"; action: string }
  | { type: "evalGraph"; index: number }
  | { type: "promotion"; promote: boolean };

export type HitState = {
  flipped: boolean;
  position: Shogi;
  playerColor: Color;
  showPromotion: unknown;
  canTakeBack: boolean;
  canStepBack: boolean;
  canStepForward: boolean;
  isLive: boolean;
  evalHistory: (number | null)[];
  /** 詰将棋モード。汎用アクションボタンは判定しない（DOM側のバーに集約）。 */
  isTsume?: boolean;
};

export function hitTest(
  layout: CanvasLayout,
  x: number,
  y: number,
  state: HitState,
): HitResult | null {
  if (state.showPromotion) {
    const { promote, decline } = getPromotionButtons(layout);
    if (inRect(x, y, promote))
      return { type: "promotion", promote: true };
    if (inRect(x, y, decline))
      return { type: "promotion", promote: false };
    return null;
  }

  const { board, cellSize } = layout;
  if (inRect(x, y, board)) {
    const col = Math.floor((x - board.x) / cellSize);
    const row = Math.floor((y - board.y) / cellSize);
    const file = state.flipped ? col + 1 : 9 - col;
    const rank = state.flipped ? 9 - row : row + 1;
    if (file >= 1 && file <= 9 && rank >= 1 && rank <= 9) {
      return { type: "square", file, rank };
    }
  }

  const topColor: Color = state.flipped ? "sente" : "gote";
  const bottomColor: Color = state.flipped ? "gote" : "sente";

  const bottom = hitHand(
    layout,
    x,
    y,
    state.position,
    bottomColor,
    true,
  );
  if (bottom) return bottom;
  const top = hitHand(layout, x, y, state.position, topColor, false);
  if (top) return top;

  for (const btn of getControlButtons(layout, state)) {
    if (!btn.hidden && !btn.disabled && inRect(x, y, btn))
      return { type: "button", action: btn.action };
  }

  const { evalGraph } = layout;
  if (inRect(x, y, evalGraph) && state.evalHistory.length >= 2) {
    const rel = (x - evalGraph.x) / evalGraph.w;
    const index = Math.round(rel * (state.evalHistory.length - 1));
    return {
      type: "evalGraph",
      index: Math.max(
        0,
        Math.min(index, state.evalHistory.length - 1),
      ),
    };
  }

  if (!state.isTsume) {
    for (const btn of getActionButtons(layout)) {
      if (inRect(x, y, btn))
        return { type: "button", action: btn.action };
    }
  }

  return null;
}

function hitHand(
  layout: CanvasLayout,
  x: number,
  y: number,
  position: Shogi,
  color: Color,
  isBottom: boolean,
): HitResult | null {
  const rect = isBottom ? layout.bottomHand : layout.topHand;
  if (!inRect(x, y, rect)) return null;

  const pieces = getHandPieces(position, color);
  const slots = getHandSlotPositions(
    rect,
    pieces,
    layout.handPieceSize,
    isBottom,
  );

  for (const slot of slots) {
    if (
      x >= slot.x &&
      x < slot.x + slot.w &&
      y >= rect.y &&
      y < rect.y + rect.h
    ) {
      return { type: "hand", role: slot.role };
    }
  }
  return null;
}

function inRect(
  x: number,
  y: number,
  r: { x: number; y: number; w: number; h: number },
): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}
