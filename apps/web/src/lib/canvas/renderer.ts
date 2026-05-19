import type { Shogi } from "shogiops/variant/shogi";
import type { Color, Role, Square, MoveOrDrop } from "shogiops/types";
import type { GameSettings } from "@/hooks/useSettings";
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
            ctx.shadowColor = "rgba(212,175,55,0.6)";
            ctx.shadowBlur = 6;
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
  for (const a of state.arrows) {
    const from = fileRankToPixel(
      a.fromFile,
      a.fromRank,
      state.flipped,
      layout.board,
      layout.cellSize,
    );
    const to = fileRankToPixel(
      a.toFile,
      a.toRank,
      state.flipped,
      layout.board,
      layout.cellSize,
    );
    drawArrow(ctx, from, to, a.color, a.opacity, a.width);
  }
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

  if (state.badMoveAlert && state.isLive) {
    const sev = state.badMoveAlert.severity;
    const bg =
      sev === "blunder"
        ? "rgba(185,28,28,0.4)"
        : sev === "mistake"
          ? "rgba(234,88,12,0.4)"
          : "rgba(202,138,4,0.3)";
    const fg =
      sev === "blunder"
        ? "#fecaca"
        : sev === "mistake"
          ? "#fed7aa"
          : "#fef08a";
    drawPill(ctx, cx, y, state.badMoveAlert.message, bg, fg, fs);
  } else if (state.message) {
    const m = state.message;
    const bg = m.includes("勝ち")
      ? "rgba(202,138,4,0.3)"
      : m.includes("王手")
        ? "rgba(220,38,38,0.3)"
        : "rgba(75,85,99,0.3)";
    const fg = m.includes("勝ち")
      ? "#fde047"
      : m.includes("王手")
        ? "#fca5a5"
        : "#d1d5db";
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
    state.turn === "sente" ? "先手の番" : "後手の番",
    `${state.moveCount}手目`,
  ];
  if (!state.engineReady) parts.push("AI読込中...");
  else if (state.aiThinking) parts.push("CPU思考中...");

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

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
