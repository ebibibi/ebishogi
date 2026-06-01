/**
 * 詰将棋用のキャンバスレイアウト。盤面と上下の持ち駒だけを扱う最小構成。
 * 操作ボタンは HTML 側で描くため、CPU 対局のような評価グラフ・タイマー領域は持たない。
 */
import type { Role } from "shogiops/types";

export type Rect = { x: number; y: number; w: number; h: number };

export type TsumeLayout = {
  cw: number;
  ch: number;
  dpr: number;
  cell: number;
  boardPx: number;
  handH: number;
  pieceSize: number;
  handPieceSize: number;
  topHand: Rect;
  board: Rect;
  bottomHand: Rect;
};

/** 持ち駒の並び順（飛→歩）。 */
export const HAND_ORDER: readonly Role[] = [
  "rook",
  "bishop",
  "gold",
  "silver",
  "knight",
  "lance",
  "pawn",
];

const GAP = 6;
const MIN_CELL = 30;
const MAX_CELL = 52;

/** 利用可能な幅（と高さ）から盤面サイズを決める。 */
export function calcTsumeLayout(vw: number, vh: number): TsumeLayout {
  const dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // 幅・高さ両方に収まる最大セルを選ぶ（盤9 + 持ち駒2段ぶん ≒ 10.4 セル）
  const fromW = Math.floor(vw / 9);
  const fromH = Math.floor(vh / 10.4);
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.min(fromW, fromH)));

  const boardPx = cell * 9;
  const handH = Math.ceil(cell * 0.72);
  const pieceSize = Math.floor(cell * 0.92);
  const handPieceSize = Math.max(20, Math.floor(cell * 0.56));

  let y = 0;
  const topHand: Rect = { x: 0, y, w: boardPx, h: handH };
  y += handH + GAP;
  const board: Rect = { x: 0, y, w: boardPx, h: boardPx };
  y += boardPx + GAP;
  const bottomHand: Rect = { x: 0, y, w: boardPx, h: handH };
  y += handH;

  return {
    cw: boardPx,
    ch: y,
    dpr,
    cell,
    boardPx,
    handH,
    pieceSize,
    handPieceSize,
    topHand,
    board,
    bottomHand,
  };
}

/** 盤上のマス (file,rank) をキャンバス座標（左上）に変換する。先手が手前（下）。 */
export function fileRankToXY(
  file: number,
  rank: number,
  board: Rect,
  cell: number,
): { x: number; y: number } {
  const col = 9 - file; // file9 が左端（col0）
  const row = rank - 1; // rank1 が上端
  return { x: board.x + col * cell, y: board.y + row * cell };
}

/** 持ち駒スロットの x 位置を計算する（攻め方=下は左詰め、玉方=上は右詰め）。 */
export function handSlotPositions(
  rect: Rect,
  pieces: Map<Role, number>,
  handPieceSize: number,
  isBottom: boolean,
): { role: Role; x: number; w: number }[] {
  const pad = 8;
  const slotW = handPieceSize + 8;
  const gap = 2;

  const roles = HAND_ORDER.filter((r) => (pieces.get(r) ?? 0) > 0);
  if (roles.length === 0) return [];

  const totalW = roles.length * slotW + (roles.length - 1) * gap;
  const result: { role: Role; x: number; w: number }[] = [];
  let x = isBottom ? rect.x + pad : rect.x + rect.w - pad - totalW;
  for (const role of roles) {
    result.push({ role, x, w: slotW });
    x += slotW + gap;
  }
  return result;
}
