/**
 * 詰将棋盤面のキャンバス描画。盤・駒・持ち駒・選択/合法手/最終手/王手・
 * 成りダイアログのみを描く（操作 UI は HTML 側）。先手＝攻め方が常に手前。
 */
import type { Shogi } from "shogiops/variant/shogi";
import type { Color, Role, Square, MoveOrDrop } from "shogiops/types";
import { coordsToSquare, getHandPieces } from "@/lib/shogi-game";
import {
  type TsumeLayout,
  type Rect,
  handSlotPositions,
} from "./tsume-layout";

export type TsumeRenderState = {
  position: Shogi;
  lastMove: MoveOrDrop | null;
  selected: Square | null;
  selectedDrop: Role | null;
  legalDests: Set<number>;
  checkSquare: Square | null;
  showPromotion: { from: Square; to: Square } | null;
};

/** 成りダイアログのボタン矩形（描画とヒット判定で共有）。 */
export function promotionButtons(layout: TsumeLayout): {
  promote: Rect;
  decline: Rect;
} {
  const cx = layout.cw / 2;
  const cy = layout.ch / 2;
  const bw = 76;
  const bh = 42;
  const gap = 16;
  const by = cy + 8;
  return {
    promote: { x: cx - gap / 2 - bw, y: by, w: bw, h: bh },
    decline: { x: cx + gap / 2, y: by, w: bw, h: bh },
  };
}

export function drawTsume(
  ctx: CanvasRenderingContext2D,
  layout: TsumeLayout,
  state: TsumeRenderState,
  images: Map<string, HTMLImageElement>,
): void {
  ctx.save();
  ctx.scale(layout.dpr, layout.dpr);

  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, layout.cw, layout.ch);

  drawHand(ctx, layout, state, images, true); // 上＝玉方(後手)
  drawBoard(ctx, layout, state, images);
  drawHand(ctx, layout, state, images, false); // 下＝攻め方(先手)

  if (state.showPromotion) drawPromotionDialog(ctx, layout);

  ctx.restore();
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  layout: TsumeLayout,
  state: TsumeRenderState,
  images: Map<string, HTMLImageElement>,
) {
  const { board, cell, pieceSize } = layout;
  const { position, selected, legalDests, lastMove, checkSquare } = state;

  ctx.fillStyle = "#D4A050";
  ctx.fillRect(board.x, board.y, board.w, board.h);
  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = 2;
  ctx.strokeRect(board.x, board.y, board.w, board.h);

  const lastSet = new Set<number>();
  if (lastMove) {
    if ("from" in lastMove) lastSet.add(lastMove.from);
    lastSet.add(lastMove.to);
  }

  const dotR = Math.max(4, Math.floor(cell * 0.12));

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const file = 9 - col;
      const rank = row + 1;
      const sq = coordsToSquare(file, rank);
      const cx = board.x + col * cell;
      const cy = board.y + row * cell;

      if (selected === sq) {
        fillCell(ctx, cx, cy, cell, "rgba(56,189,248,0.28)", "rgba(56,189,248,0.6)");
      } else if (checkSquare === sq) {
        fillCell(ctx, cx, cy, cell, "rgba(239,68,68,0.3)", "rgba(239,68,68,0.6)");
      } else if (lastSet.has(sq)) {
        ctx.fillStyle = "rgba(245,158,11,0.2)";
        ctx.fillRect(cx, cy, cell, cell);
      }

      ctx.strokeStyle = "rgba(139,105,20,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, cell, cell);

      const piece = position.board.get(sq);
      if (legalDests.has(sq)) {
        if (!piece) {
          ctx.fillStyle = "rgba(56,189,248,0.4)";
          ctx.beginPath();
          ctx.arc(cx + cell / 2, cy + cell / 2, dotR, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = "rgba(56,189,248,0.6)";
          ctx.lineWidth = 2;
          ctx.strokeRect(cx + 2, cy + 2, cell - 4, cell - 4);
        }
      }

      if (piece) {
        drawPiece(ctx, images, piece, cx, cy, cell, pieceSize, selected === sq);
      }
    }
  }

  // 星
  ctx.fillStyle = "rgba(139,105,20,0.5)";
  for (const [ci, ri] of [[3, 3], [3, 6], [6, 3], [6, 6]] as const) {
    ctx.beginPath();
    ctx.arc(board.x + ci * cell, board.y + ri * cell, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPiece(
  ctx: CanvasRenderingContext2D,
  images: Map<string, HTMLImageElement>,
  piece: { color: Color; role: Role },
  cx: number,
  cy: number,
  cell: number,
  pieceSize: number,
  selected: boolean,
) {
  const img = images.get(piece.role);
  if (!img) return;
  const rotate = piece.color === "gote"; // 攻め方が手前なので後手だけ回す
  const size = selected ? Math.floor(pieceSize * 1.08) : pieceSize;

  ctx.save();
  if (selected) {
    ctx.shadowColor = "rgba(212,175,55,0.7)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
  }
  if (rotate) {
    ctx.translate(cx + cell / 2, cy + cell / 2);
    ctx.rotate(Math.PI);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
  } else {
    ctx.drawImage(img, cx + (cell - size) / 2, cy + (cell - size) / 2, size, size);
  }
  ctx.restore();
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  layout: TsumeLayout,
  state: TsumeRenderState,
  images: Map<string, HTMLImageElement>,
  isTop: boolean,
) {
  const rect = isTop ? layout.topHand : layout.bottomHand;
  const { handPieceSize } = layout;
  const color: Color = isTop ? "gote" : "sente";
  const pieces = getHandPieces(state.position, color);

  ctx.fillStyle = "rgba(39,39,42,0.85)";
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 4);
  ctx.fill();

  const slots = handSlotPositions(rect, pieces, handPieceSize, !isTop);
  for (const slot of slots) {
    const count = pieces.get(slot.role) ?? 0;
    const selected = state.selectedDrop === slot.role && color === "sente";
    const px = slot.x + (slot.w - handPieceSize) / 2;
    const py = rect.y + (rect.h - handPieceSize) / 2;

    if (selected) {
      ctx.fillStyle = "rgba(217,119,6,0.35)";
      roundRect(ctx, slot.x, py - 2, slot.w, handPieceSize + 4, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(251,191,36,0.9)";
      ctx.lineWidth = 2;
      roundRect(ctx, slot.x, py - 2, slot.w, handPieceSize + 4, 3);
      ctx.stroke();
    }

    const img = images.get(slot.role);
    if (img) {
      ctx.save();
      if (isTop) {
        ctx.translate(px + handPieceSize / 2, py + handPieceSize / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(img, -handPieceSize / 2, -handPieceSize / 2, handPieceSize, handPieceSize);
      } else {
        ctx.drawImage(img, px, py, handPieceSize, handPieceSize);
      }
      ctx.restore();
    }

    if (count > 1) {
      const bs = Math.max(12, Math.floor(handPieceSize * 0.46));
      const bx = slot.x + slot.w - bs / 2;
      const by = rect.y + (rect.h + handPieceSize) / 2 - bs / 2 + 2;
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(bx, by, bs / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.floor(bs * 0.7)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(count), bx, by);
    }
  }

  if (slots.length === 0) {
    ctx.fillStyle = "#52525b";
    ctx.font = "12px sans-serif";
    ctx.textAlign = isTop ? "right" : "left";
    ctx.textBaseline = "middle";
    ctx.fillText("持ち駒なし", isTop ? rect.x + rect.w - 10 : rect.x + 10, rect.y + rect.h / 2);
  }
}

function drawPromotionDialog(ctx: CanvasRenderingContext2D, layout: TsumeLayout) {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, layout.cw, layout.ch);

  const cx = layout.cw / 2;
  const cy = layout.ch / 2;
  ctx.fillStyle = "#e4e4e7";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("成りますか？", cx, cy - 28);

  const { promote, decline } = promotionButtons(layout);
  drawDialogButton(ctx, promote, "成る", "#dc2626");
  drawDialogButton(ctx, decline, "不成", "#52525b");
}

function drawDialogButton(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  label: string,
  bg: string,
) {
  ctx.fillStyle = bg;
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
}

function fillCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  fill: string,
  stroke: string,
) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, cell, cell);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (w <= 0 || h <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
