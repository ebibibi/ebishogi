import type { Shogi } from "shogiops/variant/shogi";
import type { Color, Role, Square, MoveOrDrop } from "shogiops/types";
import type { GameSettings } from "@/hooks/useSettings";
import type { MoveEvaluation, MoveGrade } from "@/hooks/useAIAssist";
import type { CanvasLayout, ArrowData } from "./layout";
import {
  fileRankToPixel,
  getHandSlotPositions,
  getControlButtons,
  getActionButtons,
  getPromotionButtons,
} from "./layout";
import { coordsToSquare, getHandPieces } from "@/lib/shogi-game";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
};

export type AnimState = {
  particles: Particle[];
  captureTime: number;
  flash: boolean;
  shakeX: number;
  moveRipple: { cx: number; cy: number; startTime: number } | null;
  cpuImpact: { cx: number; cy: number; startTime: number } | null;
  alertAnim: { text: string; severity: string; startTime: number } | null;
  moveEvalAnim: { evaluation: MoveEvaluation; startTime: number } | null;
  gameEndAnim: {
    text: string;
    kind: "win" | "lose" | "draw";
    startTime: number;
  } | null;
};

export type RenderState = {
  position: Shogi;
  turn: Color;
  moveCount: number;
  isCheck: boolean;
  isEnd: boolean;
  lastMove: MoveOrDrop | null;
  playerColor: Color;
  flipped: boolean;
  selected: Square | null;
  selectedDrop: Role | null;
  legalDests: Set<number>;
  arrows: readonly ArrowData[];
  evalHistory: (number | null)[];
  currentEval: number | null;
  viewIndex: number;
  thinkingElapsed: number;
  settings: GameSettings;
  senteTime: number;
  goteTime: number;
  message: string | null;
  badMoveAlert: { message: string; severity: string } | null;
  isLive: boolean;
  engineReady: boolean;
  aiThinking: boolean;
  canTakeBack: boolean;
  canStepBack: boolean;
  canStepForward: boolean;
  showPromotion: { from: Square; to: Square } | null;
  checkSquare: Square | null;
};

const PARTICLE_COLORS = ["#FFD700", "#FF8C00", "#FF4500", "#FFFFFF", "#FFA500"];

export function createParticles(
  file: number,
  rank: number,
  flipped: boolean,
  cellSize: number,
): Particle[] {
  const col = flipped ? file - 1 : 9 - file;
  const row = flipped ? 9 - rank : rank - 1;
  const cx = col * cellSize + cellSize / 2;
  const cy = row * cellSize + cellSize / 2;
  const scale = cellSize / 48;

  return Array.from({ length: 12 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
    const speed = (80 + Math.random() * 120) * scale;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: (3 + Math.random() * 4) * scale,
      color:
        PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    };
  });
}

export function drawCanvas(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  state: RenderState,
  images: Map<string, HTMLImageElement>,
  anim: AnimState,
): void {
  ctx.save();
  ctx.scale(layout.dpr, layout.dpr);

  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, layout.canvasW, layout.canvasH);

  ctx.save();
  if (anim.shakeX !== 0) ctx.translate(anim.shakeX, 0);

  drawHandPanel(ctx, layout, state, images, true);
  drawBoard(ctx, layout, state, images);
  drawArrows(ctx, layout, state);
  drawMoveRipple(ctx, layout, anim);
  drawCpuImpact(ctx, layout, anim);
  drawHandPanel(ctx, layout, state, images, false);

  ctx.restore();

  drawControls(ctx, layout, state);
  drawEvalGraph(ctx, layout, state);
  drawTimerMeter(ctx, layout, state);
  drawInfo(ctx, layout, state);
  drawActionBtns(ctx, layout);

  if (anim.captureTime > 0 && anim.particles.length > 0) {
    const elapsed = (performance.now() - anim.captureTime) / 1000;
    if (elapsed < 0.5) drawParticles(ctx, layout, anim.particles, elapsed);
  }

  if (anim.flash) {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(
      layout.board.x,
      layout.board.y,
      layout.board.w,
      layout.board.h,
    );
  }

  if (state.showPromotion) drawPromotionDialog(ctx, layout);
  drawMoveEvalOverlay(ctx, layout, anim);
  drawBadMoveOverlay(ctx, layout, anim);
  drawGameEndOverlay(ctx, layout, anim);

  ctx.restore();
}

// ── Board ─────────────────────────────────────────────

function drawBoard(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  state: RenderState,
  images: Map<string, HTMLImageElement>,
) {
  const { board, cellSize, pieceSize } = layout;
  const { position, flipped, selected, legalDests, lastMove, checkSquare } =
    state;

  ctx.fillStyle = "#D4A050";
  ctx.fillRect(board.x, board.y, board.w, board.h);

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "#8B7355";
  ctx.lineWidth = 1;
  for (let i = 0; i < board.w; i += 11) {
    ctx.beginPath();
    ctx.moveTo(board.x + i + 0.5, board.y);
    ctx.lineTo(board.x + i + 0.5, board.y + board.h);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = 2;
  ctx.strokeRect(board.x, board.y, board.w, board.h);

  const lastMoveSet = new Set<number>();
  if (lastMove) {
    if ("from" in lastMove) lastMoveSet.add(lastMove.from);
    lastMoveSet.add(lastMove.to);
  }

  const files = flipped
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9]
    : [9, 8, 7, 6, 5, 4, 3, 2, 1];
  const ranks = flipped
    ? [9, 8, 7, 6, 5, 4, 3, 2, 1]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const dotR = Math.max(4, Math.floor(cellSize * 0.12));

  for (let ri = 0; ri < 9; ri++) {
    for (let fi = 0; fi < 9; fi++) {
      const file = files[fi];
      const rank = ranks[ri];
      const sq = coordsToSquare(file, rank);
      const cx = board.x + fi * cellSize;
      const cy = board.y + ri * cellSize;

      if (selected === sq) {
        ctx.fillStyle = "rgba(56,189,248,0.25)";
        ctx.fillRect(cx, cy, cellSize, cellSize);
        ctx.strokeStyle = "rgba(56,189,248,0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
      } else if (checkSquare === sq) {
        ctx.fillStyle = "rgba(239,68,68,0.3)";
        ctx.fillRect(cx, cy, cellSize, cellSize);
        ctx.strokeStyle = "rgba(239,68,68,0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
      } else if (lastMoveSet.has(sq)) {
        ctx.fillStyle = "rgba(245,158,11,0.2)";
        ctx.fillRect(cx, cy, cellSize, cellSize);
      }

      ctx.strokeStyle = "rgba(139,105,20,0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, cellSize, cellSize);

      const piece = position.board.get(sq);
      if (legalDests.has(sq)) {
        if (!piece) {
          ctx.fillStyle = "rgba(56,189,248,0.35)";
          ctx.beginPath();
          ctx.arc(
            cx + cellSize / 2,
            cy + cellSize / 2,
            dotR,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        } else {
          ctx.strokeStyle = "rgba(56,189,248,0.5)";
          ctx.lineWidth = 2;
          ctx.strokeRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4);
        }
      }

      if (piece) {
        const img = images.get(piece.role);
        if (img) {
          const isGote = piece.color === "gote";
          const shouldRotate = flipped ? !isGote : isGote;
          const isSelected = selected === sq;
          const drawSize = isSelected
            ? Math.floor(pieceSize * 1.08)
            : pieceSize;

          ctx.save();
          if (isSelected) {
            ctx.shadowColor = "rgba(212,175,55,0.7)";
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 3;
          } else {
            ctx.shadowColor = "rgba(0,0,0,0.4)";
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 2;
          }

          if (shouldRotate) {
            ctx.translate(cx + cellSize / 2, cy + cellSize / 2);
            ctx.rotate(Math.PI);
            ctx.drawImage(
              img,
              -drawSize / 2,
              -drawSize / 2,
              drawSize,
              drawSize,
            );
          } else {
            const px = cx + (cellSize - drawSize) / 2;
            const py = cy + (cellSize - drawSize) / 2;
            ctx.drawImage(img, px, py, drawSize, drawSize);
          }
          ctx.restore();
        }
      }
    }
  }

  ctx.fillStyle = "rgba(139,105,20,0.5)";
  for (const [ci, ri] of [
    [3, 3],
    [3, 6],
    [6, 3],
    [6, 6],
  ] as const) {
    ctx.beginPath();
    ctx.arc(
      board.x + ci * cellSize,
      board.y + ri * cellSize,
      3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

// ── Hand Panel ────────────────────────────────────────

function drawHandPanel(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  state: RenderState,
  images: Map<string, HTMLImageElement>,
  isTop: boolean,
) {
  const rect = isTop ? layout.topHand : layout.bottomHand;
  const { cellSize, handPieceSize } = layout;
  const { position, flipped, selectedDrop } = state;

  const topColor: Color = flipped ? "sente" : "gote";
  const bottomColor: Color = flipped ? "gote" : "sente";
  const color = isTop ? topColor : bottomColor;
  const isActive = position.turn === color;
  const pieces = getHandPieces(position, color);

  ctx.fillStyle = isActive ? "rgba(39,39,42,0.9)" : "rgba(39,39,42,0.6)";
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 4);
  ctx.fill();
  if (isActive) {
    ctx.strokeStyle = "rgba(245,158,11,0.3)";
    ctx.lineWidth = 1;
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 4);
    ctx.stroke();
  }

  const slots = getHandSlotPositions(rect, pieces, handPieceSize, !isTop);

  for (const slot of slots) {
    const role = slot.role;
    const count = pieces.get(role) ?? 0;
    const isSel = selectedDrop === role && isActive;

    if (isSel) {
      ctx.fillStyle = "rgba(217,119,6,0.3)";
      rr(
        ctx,
        slot.x,
        rect.y + (rect.h - handPieceSize - 4) / 2,
        slot.w,
        handPieceSize + 4,
        3,
      );
      ctx.fill();
      ctx.strokeStyle = "rgba(251,191,36,0.8)";
      ctx.lineWidth = 2;
      rr(
        ctx,
        slot.x,
        rect.y + (rect.h - handPieceSize - 4) / 2,
        slot.w,
        handPieceSize + 4,
        3,
      );
      ctx.stroke();
    }

    const img = images.get(role);
    if (img) {
      const isGote = color === "gote";
      const shouldRotate = flipped ? !isGote : isGote;
      const px = slot.x + (slot.w - handPieceSize) / 2;
      const py = rect.y + (rect.h - handPieceSize) / 2;

      ctx.save();
      if (!isActive) ctx.globalAlpha = 0.6;
      if (shouldRotate) {
        ctx.translate(px + handPieceSize / 2, py + handPieceSize / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(
          img,
          -handPieceSize / 2,
          -handPieceSize / 2,
          handPieceSize,
          handPieceSize,
        );
      } else {
        ctx.drawImage(img, px, py, handPieceSize, handPieceSize);
      }
      ctx.restore();
    }

    if (count > 1) {
      const bs = Math.max(12, Math.floor(handPieceSize * 0.45));
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
    const dx = !isTop ? rect.x + 12 : rect.x + rect.w - 16;
    ctx.fillStyle = "#52525b";
    ctx.font = `${Math.max(9, Math.floor(handPieceSize * 0.5))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("-", dx, rect.y + rect.h / 2);
  }

  const name = isTop ? "CPU" : "あなた";
  const timer = fmtTime(isTop ? state.goteTime : state.senteTime);
  const nameSz = Math.max(9, Math.floor(cellSize * 0.2));
  const timerSz = Math.max(11, Math.floor(cellSize * 0.28));
  const pad = 8;

  if (isTop) {
    let lx = rect.x + pad;
    ctx.font = `bold ${nameSz}px sans-serif`;
    const nw = ctx.measureText(name).width;
    ctx.fillStyle = "#3f3f46";
    rr(ctx, lx, rect.y + rect.h / 2 - nameSz / 2 - 2, nw + 8, nameSz + 4, 3);
    ctx.fill();
    ctx.fillStyle = "#d4d4d8";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(name, lx + 4, rect.y + rect.h / 2);
    lx += nw + 14;

    ctx.fillStyle = isActive ? "#fbbf24" : "#71717a";
    ctx.font = `bold ${timerSz}px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(timer, lx, rect.y + rect.h / 2);
  } else {
    let rx = rect.x + rect.w - pad;
    ctx.font = `bold ${timerSz}px monospace`;
    const tw = ctx.measureText(timer).width;
    ctx.fillStyle = isActive ? "#fbbf24" : "#71717a";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(timer, rx, rect.y + rect.h / 2);
    rx -= tw + 6;

    ctx.font = `bold ${nameSz}px sans-serif`;
    const nw = ctx.measureText(name).width;
    ctx.fillStyle = "#3f3f46";
    rr(
      ctx,
      rx - nw - 4,
      rect.y + rect.h / 2 - nameSz / 2 - 2,
      nw + 8,
      nameSz + 4,
      3,
    );
    ctx.fill();
    ctx.fillStyle = "#d4d4d8";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(name, rx, rect.y + rect.h / 2);
  }
}

// ── Arrows ────────────────────────────────────────────

function drawArrows(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  state: RenderState,
) {
  const bottomColor: Color = state.flipped ? "gote" : "sente";
  const playerIsBottom = state.playerColor === bottomColor;
  const handRect = playerIsBottom ? layout.bottomHand : layout.topHand;
  const handPieces = getHandPieces(state.position, state.playerColor);
  const slots = getHandSlotPositions(
    handRect,
    handPieces,
    layout.handPieceSize,
    playerIsBottom,
  );

  const badges: { x: number; y: number; rank: number; color: string; promotionLabel?: "成" | "不成" }[] = [];

  for (const a of state.arrows) {
    const to = fileRankToPixel(
      a.toFile,
      a.toRank,
      state.flipped,
      layout.board,
      layout.cellSize,
    );
    if (a.fromFile !== undefined && a.fromRank !== undefined) {
      const from = fileRankToPixel(
        a.fromFile,
        a.fromRank,
        state.flipped,
        layout.board,
        layout.cellSize,
      );
      drawArrow(ctx, from, to, a.color, a.opacity, a.width);
    } else if (a.dropRole) {
      const slot = slots.find((s) => s.role === a.dropRole);
      if (slot) {
        const from = {
          x: slot.x + slot.w / 2,
          y: handRect.y + handRect.h / 2,
        };
        drawArrow(ctx, from, to, a.color, a.opacity, a.width);
      } else {
        drawDropMarker(ctx, to, a.color, a.opacity, a.width, layout.cellSize);
      }
    } else {
      drawDropMarker(ctx, to, a.color, a.opacity, a.width, layout.cellSize);
    }

    if (a.rank !== undefined) {
      badges.push({ x: to.x, y: to.y, rank: a.rank, color: a.color, promotionLabel: a.promotionLabel });
    }
  }

  for (const b of badges) {
    drawRankBadge(ctx, b.x, b.y, b.rank, b.color, layout.cellSize);
    if (b.promotionLabel) {
      drawPromotionLabel(ctx, b.x, b.y, b.promotionLabel, layout.cellSize);
    }
  }
}

function drawRankBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rank: number,
  color: string,
  cellSize: number,
) {
  const r = Math.max(8, Math.floor(cellSize * 0.2));
  const bx = cx + cellSize * 0.32;
  const by = cy - cellSize * 0.32;

  ctx.save();

  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#000";
  ctx.font = `bold ${Math.floor(r * 1.3)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(rank), bx, by);

  ctx.restore();
}

function drawPromotionLabel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  label: "成" | "不成",
  cellSize: number,
) {
  const badgeR = Math.max(8, Math.floor(cellSize * 0.2));
  const bx = cx + cellSize * 0.32;
  const by = cy - cellSize * 0.32 + badgeR + 2;

  const fontSize = Math.max(8, Math.floor(cellSize * 0.18));
  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  const tw = ctx.measureText(label).width;
  const pw = tw + 6;
  const ph = fontSize + 4;

  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 3;
  ctx.fillStyle = label === "成" ? "rgba(220,38,38,0.9)" : "rgba(82,82,91,0.9)";
  rr(ctx, bx - pw / 2, by, pw, ph, 3);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, bx, by + ph / 2);
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  opacity: number,
  width: number,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;

  const headLen = Math.min(12, len * 0.3);
  const angle = Math.atan2(dy, dx);
  const tipX = to.x - (dx / len) * 2;
  const tipY = to.y - (dy / len) * 2;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.shadowColor = color;
  ctx.shadowBlur = width * 3;

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const ha = Math.PI / 6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - headLen * Math.cos(angle - ha),
    tipY - headLen * Math.sin(angle - ha),
  );
  ctx.lineTo(
    tipX - headLen * Math.cos(angle + ha),
    tipY - headLen * Math.sin(angle + ha),
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawDropMarker(
  ctx: CanvasRenderingContext2D,
  pos: { x: number; y: number },
  color: string,
  opacity: number,
  width: number,
  cellSize: number,
) {
  const r = cellSize * 0.35;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.shadowColor = color;
  ctx.shadowBlur = width * 3;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ── Controls ──────────────────────────────────────────

function drawControls(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  state: RenderState,
) {
  for (const btn of getControlButtons(layout, state)) drawBtn(ctx, btn);
}

// ── Eval Graph ────────────────────────────────────────

function drawEvalGraph(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  state: RenderState,
) {
  const { evalGraph } = layout;
  const { evalHistory, viewIndex } = state;
  if (evalHistory.length < 2) return;

  ctx.fillStyle = "rgba(39,39,42,0.6)";
  rr(ctx, evalGraph.x, evalGraph.y, evalGraph.w, evalGraph.h, 6);
  ctx.fill();

  const maxCp = 2000;
  const pad = 3;
  const cpToY = (cp: number | null) => {
    const c = Math.max(-maxCp, Math.min(maxCp, cp ?? 0));
    return (
      evalGraph.y +
      evalGraph.h / 2 -
      (c / maxCp) * (evalGraph.h / 2 - pad)
    );
  };

  ctx.strokeStyle = "#555";
  ctx.lineWidth = 0.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(evalGraph.x, evalGraph.y + evalGraph.h / 2);
  ctx.lineTo(evalGraph.x + evalGraph.w, evalGraph.y + evalGraph.h / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const pts = evalHistory.map((cp, i) => ({
    x: evalGraph.x + (i / (evalHistory.length - 1)) * evalGraph.w,
    y: cpToY(cp),
  }));

  ctx.fillStyle = "rgba(212,175,55,0.12)";
  ctx.beginPath();
  ctx.moveTo(evalGraph.x, evalGraph.y + evalGraph.h / 2);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  ctx.lineTo(evalGraph.x + evalGraph.w, evalGraph.y + evalGraph.h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  pts.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
  );
  ctx.stroke();

  const cur = pts[viewIndex];
  if (cur) {
    ctx.fillStyle = "#d4af37";
    ctx.beginPath();
    ctx.arc(cur.x, cur.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (state.currentEval !== null) {
    const ev = fmtEval(state.currentEval);
    const efs = Math.max(10, Math.floor(evalGraph.h * 0.4));
    ctx.font = `bold ${efs}px monospace`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText(ev.text, evalGraph.x + evalGraph.w - 3, evalGraph.y + 3);
    ctx.fillStyle = ev.color;
    ctx.fillText(ev.text, evalGraph.x + evalGraph.w - 4, evalGraph.y + 2);
  }
}

// ── Timer Meter ───────────────────────────────────────

function drawTimerMeter(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  state: RenderState,
) {
  const { timerMeter } = layout;
  const active =
    state.turn === state.playerColor &&
    state.isLive &&
    state.engineReady &&
    !state.isEnd;

  const thresholds = [
    { s: state.settings.arrowDelay3rd, c: "#92400e", ac: "#b45309" },
    { s: state.settings.arrowDelay2nd, c: "#71717a", ac: "#d4d4d8" },
    { s: state.settings.arrowDelay1st, c: "#854d0e", ac: "#eab308" },
  ].sort((a, b) => a.s - b.s);

  const maxS = Math.max(...thresholds.map((t) => t.s));
  if (maxS <= 0) return;

  const dMax = maxS * 1.08;
  const progress = active
    ? Math.min(state.thinkingElapsed / dMax, 1)
    : 0;

  ctx.fillStyle = "#27272a";
  rr(ctx, timerMeter.x, timerMeter.y, timerMeter.w, timerMeter.h, 4);
  ctx.fill();
  ctx.strokeStyle = "#3f3f46";
  ctx.lineWidth = 1;
  rr(ctx, timerMeter.x, timerMeter.y, timerMeter.w, timerMeter.h, 4);
  ctx.stroke();

  if (progress > 0) {
    const g = ctx.createLinearGradient(
      timerMeter.x,
      0,
      timerMeter.x + timerMeter.w * progress,
      0,
    );
    g.addColorStop(0, "rgba(146,64,14,0.6)");
    g.addColorStop(0.5, "rgba(180,83,9,0.5)");
    g.addColorStop(1, "rgba(245,158,11,0.4)");
    ctx.save();
    rr(ctx, timerMeter.x, timerMeter.y, timerMeter.w, timerMeter.h, 4);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.fillRect(
      timerMeter.x,
      timerMeter.y,
      timerMeter.w * progress,
      timerMeter.h,
    );
    ctx.restore();
  }

  for (const t of thresholds) {
    const x = timerMeter.x + (t.s / dMax) * timerMeter.w;
    ctx.fillStyle =
      active && state.thinkingElapsed >= t.s ? t.ac : t.c;
    ctx.fillRect(x, timerMeter.y, 2, timerMeter.h);
  }
}

// ── Info Area ─────────────────────────────────────────

function drawInfo(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  state: RenderState,
) {
  const { infoArea, cellSize } = layout;
  const fs = Math.max(11, Math.floor(cellSize * 0.24));
  const sfs = Math.max(9, Math.floor(cellSize * 0.18));
  const cx = infoArea.x + infoArea.w / 2;
  let y = infoArea.y + 2;

  if (state.message && !state.isEnd) {
    const m = state.message;
    const bg = m.includes("王手")
      ? "rgba(220,38,38,0.3)"
      : "rgba(75,85,99,0.3)";
    const fg = m.includes("王手") ? "#fca5a5" : "#d1d5db";
    drawPill(ctx, cx, y, m, bg, fg, fs);
  } else if (!state.isLive) {
    ctx.fillStyle = "rgba(251,191,36,0.8)";
    ctx.font = `${sfs}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `棋譜閲覧中（${state.viewIndex}手目）`,
      cx,
      y + fs / 2 + 2,
    );
  }

  y += fs + 10;

  const parts = [
    state.turn === "sente" ? "先手" : "後手",
    `${state.moveCount}手`,
  ];
  if (!state.engineReady) parts.push("AI読込中...");
  else if (state.aiThinking) parts.push("CPU思考中...");
  if (state.currentEval !== null && state.engineReady && !state.aiThinking) {
    parts.push(fmtEval(state.currentEval).text);
  }

  ctx.fillStyle = "#a1a1aa";
  ctx.font = `${sfs}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(parts.join("  "), cx, y);
}

// ── Action Buttons ────────────────────────────────────

function drawActionBtns(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
) {
  for (const btn of getActionButtons(layout)) drawBtn(ctx, btn);
}

// ── Promotion Dialog ──────────────────────────────────

function drawPromotionDialog(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
) {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, layout.canvasW, layout.canvasH);

  const cx = layout.canvasW / 2;
  const cy = layout.canvasH / 2;
  const dw = 200;
  const dh = 120;

  ctx.fillStyle = "#3f3f46";
  rr(ctx, cx - dw / 2, cy - dh / 2, dw, dh, 12);
  ctx.fill();
  ctx.strokeStyle = "#52525b";
  ctx.lineWidth = 1;
  rr(ctx, cx - dw / 2, cy - dh / 2, dw, dh, 12);
  ctx.stroke();

  ctx.fillStyle = "#e4e4e7";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("成りますか？", cx, cy - 25);

  const { promote, decline } = getPromotionButtons(layout);

  ctx.fillStyle = "#dc2626";
  rr(ctx, promote.x, promote.y, promote.w, promote.h, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("成る", promote.x + promote.w / 2, promote.y + promote.h / 2);

  ctx.fillStyle = "#52525b";
  rr(ctx, decline.x, decline.y, decline.w, decline.h, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText("不成", decline.x + decline.w / 2, decline.y + decline.h / 2);
}

// ── Particles ─────────────────────────────────────────

function drawParticles(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  particles: Particle[],
  elapsed: number,
) {
  const { board } = layout;
  ctx.save();
  const life = Math.max(0, 1 - elapsed / 0.5);
  for (const p of particles) {
    ctx.globalAlpha = life * 0.9;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(
      board.x + p.x + p.vx * elapsed,
      board.y + p.y + p.vy * elapsed,
      p.size * life,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

// ── Move Ripple ──────────────────────────────────

function drawMoveRipple(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  anim: AnimState,
) {
  if (!anim.moveRipple) return;
  const elapsed = (performance.now() - anim.moveRipple.startTime) / 1000;
  if (elapsed > 0.4) return;

  const progress = elapsed / 0.4;
  const maxRadius = layout.cellSize * 0.6;
  const radius = maxRadius * progress;
  const alpha = (1 - progress) * 0.5;

  const cx = layout.board.x + anim.moveRipple.cx;
  const cy = layout.board.y + anim.moveRipple.cy;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(56,189,248,0.15)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCpuImpact(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  anim: AnimState,
) {
  if (!anim.cpuImpact) return;
  const elapsed = (performance.now() - anim.cpuImpact.startTime) / 1000;
  if (elapsed > 0.7) return;

  const cx = layout.board.x + anim.cpuImpact.cx;
  const cy = layout.board.y + anim.cpuImpact.cy;
  const cell = layout.cellSize;

  ctx.save();

  const flashT = Math.min(elapsed / 0.12, 1);
  if (flashT < 1) {
    const flashAlpha = (1 - flashT) * 0.6;
    const flashR = cell * (0.3 + flashT * 0.8);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
    grad.addColorStop(0, `rgba(255,255,200,${flashAlpha})`);
    grad.addColorStop(0.5, `rgba(255,200,50,${flashAlpha * 0.5})`);
    grad.addColorStop(1, `rgba(255,150,0,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 3; i++) {
    const ringDelay = i * 0.07;
    const ringT = Math.max(0, elapsed - ringDelay) / 0.5;
    if (ringT <= 0 || ringT >= 1) continue;
    const ringR = cell * (0.2 + ringT * 1.5);
    const ringAlpha = (1 - ringT) * 0.7;
    ctx.globalAlpha = ringAlpha;
    ctx.strokeStyle = i === 0 ? "#FFD700" : i === 1 ? "#FFA500" : "#FF6347";
    ctx.lineWidth = (3 - i) * 1.5 * (1 - ringT);
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  const lineCount = 16;
  const lineT = Math.min(elapsed / 0.5, 1);
  if (lineT < 1) {
    ctx.globalAlpha = (1 - lineT) * 0.6;
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < lineCount; i++) {
      const angle = (Math.PI * 2 * i) / lineCount;
      const innerR = cell * (0.3 + lineT * 0.5);
      const outerR = cell * (0.5 + lineT * 1.8);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ── Bad Move Overlay ─────────────────────────────

function drawBadMoveOverlay(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  anim: AnimState,
) {
  if (!anim.alertAnim) return;
  const elapsed = (performance.now() - anim.alertAnim.startTime) / 1000;
  if (elapsed > 3.0) return;

  const { text, severity } = anim.alertAnim;
  let bgAlpha = 0.35;
  if (elapsed < 0.15) bgAlpha = (elapsed / 0.15) * 0.35;
  else if (elapsed > 2.5) bgAlpha = 0.35 * (1 - (elapsed - 2.5) / 0.5);

  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
  ctx.fillRect(0, 0, layout.canvasW, layout.canvasH);

  let scale = 1;
  let alpha = 1;
  if (elapsed < 0.12) {
    scale = 1.8 - 0.8 * (elapsed / 0.12);
  } else if (elapsed < 0.22) {
    scale = 1 + 0.06 * Math.sin(((elapsed - 0.12) / 0.1) * Math.PI);
  } else if (elapsed > 2.5) {
    alpha = 1 - (elapsed - 2.5) / 0.5;
    scale = 1 + (elapsed - 2.5) * 0.15;
  }

  const cx = layout.canvasW / 2;
  const cy = layout.canvasH * 0.38;

  const colors: Record<string, { bg: string; fg: string; outline: string }> = {
    blunder: { bg: "rgba(185,28,28,0.9)", fg: "#fff", outline: "#fca5a5" },
    mistake: { bg: "rgba(234,88,12,0.9)", fg: "#fff", outline: "#fed7aa" },
    inaccuracy: { bg: "rgba(161,98,7,0.85)", fg: "#fff", outline: "#fef08a" },
  };
  const c = colors[severity] ?? colors.inaccuracy;
  const fontSize = Math.max(36, Math.floor(layout.cellSize * 0.75));

  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.font = `bold ${fontSize}px sans-serif`;
  const tw = ctx.measureText(text).width;
  const pw = tw + 48;
  const ph = fontSize + 28;

  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = c.bg;
  rr(ctx, -pw / 2, -ph / 2, pw, ph, 16);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 2;
  rr(ctx, -pw / 2, -ph / 2, pw, ph, 16);
  ctx.stroke();

  ctx.fillStyle = c.fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 6;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// ── Move Evaluation Overlay ──────────────────────────

const GRADE_STYLES: Record<
  MoveGrade,
  { bg: string; fg: string; outline: string; glow: string; icon: string }
> = {
  best: {
    bg: "rgba(21,128,61,0.92)",
    fg: "#bbf7d0",
    outline: "#4ade80",
    glow: "rgba(74,222,128,0.5)",
    icon: "★",
  },
  great: {
    bg: "rgba(22,163,74,0.88)",
    fg: "#dcfce7",
    outline: "#86efac",
    glow: "rgba(134,239,172,0.4)",
    icon: "◎",
  },
  good: {
    bg: "rgba(37,99,235,0.85)",
    fg: "#dbeafe",
    outline: "#93c5fd",
    glow: "rgba(147,197,253,0.3)",
    icon: "○",
  },
  neutral: {
    bg: "rgba(75,85,99,0.82)",
    fg: "#e5e7eb",
    outline: "#9ca3af",
    glow: "rgba(156,163,175,0.2)",
    icon: "─",
  },
  inaccuracy: {
    bg: "rgba(161,98,7,0.88)",
    fg: "#fef9c3",
    outline: "#fde047",
    glow: "rgba(253,224,71,0.3)",
    icon: "?!",
  },
  mistake: {
    bg: "rgba(234,88,12,0.9)",
    fg: "#fed7aa",
    outline: "#fb923c",
    glow: "rgba(251,146,60,0.4)",
    icon: "?",
  },
  blunder: {
    bg: "rgba(185,28,28,0.92)",
    fg: "#fecaca",
    outline: "#f87171",
    glow: "rgba(248,113,113,0.5)",
    icon: "??",
  },
};

function drawMoveEvalOverlay(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  anim: AnimState,
) {
  if (!anim.moveEvalAnim) return;
  const elapsed = (performance.now() - anim.moveEvalAnim.startTime) / 1000;
  if (elapsed > 3.0) return;

  const { evaluation } = anim.moveEvalAnim;
  const style = GRADE_STYLES[evaluation.grade];

  let bgAlpha = 0.25;
  if (elapsed < 0.2) bgAlpha = (elapsed / 0.2) * 0.25;
  else if (elapsed > 2.5) bgAlpha = 0.25 * (1 - (elapsed - 2.5) / 0.5);

  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
  ctx.fillRect(0, 0, layout.canvasW, layout.canvasH);

  let scale = 1;
  let alpha = 1;
  if (elapsed < 0.15) {
    scale = 1.6 - 0.6 * (elapsed / 0.15);
  } else if (elapsed < 0.25) {
    scale = 1 + 0.04 * Math.sin(((elapsed - 0.15) / 0.1) * Math.PI);
  } else if (elapsed > 2.5) {
    alpha = 1 - (elapsed - 2.5) / 0.5;
    scale = 1 - (elapsed - 2.5) * 0.08;
  }

  const cx = layout.canvasW / 2;
  const cy = layout.board.y + layout.board.h * 0.35;

  const titleFs = Math.max(28, Math.floor(layout.cellSize * 0.6));
  const subFs = Math.max(14, Math.floor(layout.cellSize * 0.3));
  const smallFs = Math.max(12, Math.floor(layout.cellSize * 0.25));

  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const cardW = Math.max(200, Math.floor(layout.board.w * 0.65));
  const cardH = titleFs + subFs * 2 + smallFs + 56;

  ctx.shadowColor = style.glow;
  ctx.shadowBlur = 24;
  ctx.fillStyle = style.bg;
  rr(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 16);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 2;
  rr(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 16);
  ctx.stroke();

  let yOff = -cardH / 2 + 16;

  ctx.fillStyle = style.fg;
  ctx.font = `bold ${titleFs}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = style.glow;
  ctx.shadowBlur = 8;
  ctx.fillText(`${style.icon} ${evaluation.label}`, 0, yOff + titleFs / 2);
  ctx.shadowBlur = 0;

  yOff += titleFs + 10;

  const evBefore = fmtEval(evaluation.evalBefore);
  const evAfter = fmtEval(evaluation.evalAfter);
  ctx.font = `bold ${subFs}px monospace`;
  const arrowStr = "  →  ";
  const fullW =
    ctx.measureText(evBefore.text).width +
    ctx.measureText(arrowStr).width +
    ctx.measureText(evAfter.text).width;
  let tx = -fullW / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = evBefore.color;
  ctx.fillText(evBefore.text, tx, yOff + subFs / 2);
  tx += ctx.measureText(evBefore.text).width;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(arrowStr, tx, yOff + subFs / 2);
  tx += ctx.measureText(arrowStr).width;
  ctx.fillStyle = evAfter.color;
  ctx.fillText(evAfter.text, tx, yOff + subFs / 2);
  ctx.textAlign = "center";

  yOff += subFs + 6;

  const changeSign = evaluation.evalChange >= 0 ? "+" : "";
  const changeColor =
    evaluation.evalChange >= 0
      ? "rgba(134,239,172,0.9)"
      : evaluation.evalChange > -100
        ? "rgba(253,224,71,0.9)"
        : "rgba(248,113,113,0.9)";
  ctx.font = `bold ${smallFs}px monospace`;
  ctx.fillStyle = changeColor;
  ctx.fillText(
    `(${changeSign}${evaluation.evalChange})`,
    0,
    yOff + smallFs / 2,
  );

  yOff += smallFs + 8;

  const rankText =
    evaluation.candidateRank !== null
      ? `第${evaluation.candidateRank}候補`
      : "候補外";
  const rankColor =
    evaluation.candidateRank === 1
      ? "#fbbf24"
      : evaluation.candidateRank !== null
        ? "#93c5fd"
        : "#a1a1aa";
  ctx.font = `bold ${smallFs}px sans-serif`;
  ctx.fillStyle = rankColor;
  ctx.fillText(rankText, 0, yOff + smallFs / 2);

  ctx.restore();
}

// ── Game End Overlay ─────────────────────────────────

function drawGameEndOverlay(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  anim: AnimState,
) {
  if (!anim.gameEndAnim) return;
  const elapsed = (performance.now() - anim.gameEndAnim.startTime) / 1000;
  const { text, kind } = anim.gameEndAnim;

  const fadeIn = Math.min(elapsed / 0.4, 1);
  const bgAlpha = 0.5 * fadeIn;

  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
  ctx.fillRect(0, 0, layout.canvasW, layout.canvasH);

  let scale = 1;
  if (elapsed < 0.15) {
    scale = 2.0 - 1.0 * (elapsed / 0.15);
  } else if (elapsed < 0.3) {
    scale = 1 + 0.1 * Math.sin(((elapsed - 0.15) / 0.15) * Math.PI);
  }

  const cx = layout.canvasW / 2;
  const cy = layout.board.y + layout.board.h * 0.45;
  const fontSize = Math.max(40, Math.floor(layout.cellSize * 0.9));

  const styles = {
    win: {
      bg: "rgba(161,98,7,0.92)",
      fg: "#fef08a",
      outline: "#facc15",
      glow: "rgba(250,204,21,0.6)",
    },
    lose: {
      bg: "rgba(127,29,29,0.88)",
      fg: "#fecaca",
      outline: "#f87171",
      glow: "rgba(248,113,113,0.4)",
    },
    draw: {
      bg: "rgba(55,65,81,0.88)",
      fg: "#e5e7eb",
      outline: "#9ca3af",
      glow: "rgba(156,163,175,0.3)",
    },
  };
  const s = styles[kind];

  ctx.globalAlpha = fadeIn;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.font = `bold ${fontSize}px sans-serif`;
  const tw = ctx.measureText(text).width;
  const pw = tw + 60;
  const ph = fontSize + 40;

  ctx.shadowColor = s.glow;
  ctx.shadowBlur = 30;
  ctx.fillStyle = s.bg;
  rr(ctx, -pw / 2, -ph / 2, pw, ph, 20);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = s.outline;
  ctx.lineWidth = 3;
  rr(ctx, -pw / 2, -ph / 2, pw, ph, 20);
  ctx.stroke();

  ctx.fillStyle = s.fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = s.glow;
  ctx.shadowBlur = 12;
  ctx.fillText(text, 0, 0);

  ctx.restore();
}

// ── Helpers ───────────────────────────────────────────

function drawBtn(
  ctx: CanvasRenderingContext2D,
  btn: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    disabled: boolean;
    style: string;
  },
) {
  ctx.save();
  if (btn.disabled) ctx.globalAlpha = 0.3;

  const bg =
    btn.style === "accent"
      ? "rgba(217,119,6,0.8)"
      : btn.style === "subtle"
        ? "#27272a"
        : "#3f3f46";
  const fg =
    btn.style === "accent"
      ? "#fef3c7"
      : btn.style === "subtle"
        ? "#a1a1aa"
        : "#fff";

  ctx.fillStyle = bg;
  rr(ctx, btn.x, btn.y, btn.w, btn.h, 6);
  ctx.fill();

  ctx.fillStyle = fg;
  ctx.font = `${Math.max(10, Math.floor(btn.h * 0.5))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);

  ctx.restore();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  text: string,
  bg: string,
  fg: string,
  fs: number,
) {
  ctx.font = `bold ${fs}px sans-serif`;
  const tw = ctx.measureText(text).width;
  const pw = tw + 16;
  const ph = fs + 8;
  ctx.fillStyle = bg;
  rr(ctx, cx - pw / 2, y, pw, ph, 6);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, y + ph / 2);
}

function rr(
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
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fmtEval(cp: number): { text: string; color: string } {
  const sign = cp >= 0 ? "+" : "";
  const text = `${sign}${cp}`;
  if (cp > 300) return { text, color: "#22c55e" };
  if (cp > 100) return { text, color: "#d4af37" };
  if (cp > -100) return { text, color: "#a1a1aa" };
  if (cp > -300) return { text, color: "#f97316" };
  return { text, color: "#ef4444" };
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
