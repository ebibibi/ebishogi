import type { Role } from "shogiops/types";

export type Rect = { x: number; y: number; w: number; h: number };

export type CanvasLayout = {
  canvasW: number;
  canvasH: number;
  dpr: number;
  cellSize: number;
  boardPx: number;
  handH: number;
  pieceSize: number;
  handPieceSize: number;
  topHand: Rect;
  board: Rect;
  bottomHand: Rect;
  controls: Rect;
  evalGraph: Rect;
  timerMeter: Rect;
  infoArea: Rect;
  actionButtons: Rect;
};

export type ArrowData = {
  fromFile?: number;
  fromRank?: number;
  toFile: number;
  toRank: number;
  color: string;
  opacity: number;
  width: number;
};

export type ButtonDef = {
  label: string;
  action: string;
  x: number;
  y: number;
  w: number;
  h: number;
  disabled: boolean;
  style: "default" | "accent" | "subtle";
};

export const HAND_ORDER: Role[] = [
  "rook",
  "bishop",
  "gold",
  "silver",
  "knight",
  "lance",
  "pawn",
];

const CONTROLS_H = 28;
const EVAL_H = 30;
const METER_H = 8;
const INFO_H = 36;
const BTN_H = 28;
const GAP = 3;
const BOTTOM_PAD = 6;
const FIXED = CONTROLS_H + EVAL_H + METER_H + INFO_H + BTN_H + GAP * 7 + BOTTOM_PAD;

export function calcLayout(vw: number, vh: number): CanvasLayout {
  const dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const fromH = Math.floor((vh - FIXED) / 10.3);
  const fromW = Math.floor(vw / 9);
  const cellSize = Math.max(32, Math.min(fromH, fromW));

  const boardPx = cellSize * 9;
  const handH = Math.ceil(cellSize * 0.65);
  const pieceSize = Math.floor(cellSize * 0.92);
  const handPieceSize = Math.max(18, Math.floor(cellSize * 0.5));

  const contentW = boardPx;
  const ox = Math.floor((vw - contentW) / 2);
  let y = 0;

  const topHand: Rect = { x: 0, y, w: contentW, h: handH };
  y += handH + GAP;
  const board: Rect = { x: 0, y, w: boardPx, h: boardPx };
  y += boardPx + GAP;
  const bottomHand: Rect = { x: 0, y, w: contentW, h: handH };
  y += handH + GAP;
  const controls: Rect = { x: 0, y, w: contentW, h: CONTROLS_H };
  y += CONTROLS_H + GAP;
  const evalGraph: Rect = { x: 0, y, w: contentW, h: EVAL_H };
  y += EVAL_H + GAP;
  const timerMeter: Rect = { x: 0, y, w: contentW, h: METER_H };
  y += METER_H + GAP;
  const infoArea: Rect = { x: 0, y, w: contentW, h: INFO_H };
  y += INFO_H + GAP;
  const actionButtons: Rect = { x: 0, y, w: contentW, h: BTN_H };
  y += BTN_H;

  const contentH = y;
  const oy = Math.max(0, Math.floor((vh - contentH) / 2));
  const shift = (r: Rect): Rect => ({
    x: r.x + ox,
    y: r.y + oy,
    w: r.w,
    h: r.h,
  });

  return {
    canvasW: vw,
    canvasH: vh,
    dpr,
    cellSize,
    boardPx,
    handH,
    pieceSize,
    handPieceSize,
    topHand: shift(topHand),
    board: shift(board),
    bottomHand: shift(bottomHand),
    controls: shift(controls),
    evalGraph: shift(evalGraph),
    timerMeter: shift(timerMeter),
    infoArea: shift(infoArea),
    actionButtons: shift(actionButtons),
  };
}

export function fileRankToPixel(
  file: number,
  rank: number,
  flipped: boolean,
  board: Rect,
  cellSize: number,
): { x: number; y: number } {
  const col = flipped ? file - 1 : 9 - file;
  const row = flipped ? 9 - rank : rank - 1;
  return {
    x: board.x + col * cellSize + cellSize / 2,
    y: board.y + row * cellSize + cellSize / 2,
  };
}

export function getHandSlotPositions(
  rect: Rect,
  pieces: Map<Role, number>,
  handPieceSize: number,
  isBottom: boolean,
): { role: Role; x: number; w: number }[] {
  const pad = 8;
  const slotW = handPieceSize + 6;
  const gap = 2;

  const roles: Role[] = [];
  for (const role of HAND_ORDER) {
    if (pieces.get(role)) roles.push(role);
  }
  if (roles.length === 0) return [];

  const totalW = roles.length * slotW + (roles.length - 1) * gap;
  const result: { role: Role; x: number; w: number }[] = [];

  if (isBottom) {
    let x = rect.x + pad;
    for (const role of roles) {
      result.push({ role, x, w: slotW });
      x += slotW + gap;
    }
  } else {
    let x = rect.x + rect.w - pad - totalW;
    for (const role of roles) {
      result.push({ role, x, w: slotW });
      x += slotW + gap;
    }
  }

  return result;
}

export function getControlButtons(
  layout: CanvasLayout,
  state: {
    canTakeBack: boolean;
    canStepBack: boolean;
    canStepForward: boolean;
    isLive: boolean;
  },
): ButtonDef[] {
  const { controls } = layout;
  const btnH = 24;
  const gap = 4;
  const y = controls.y + (controls.h - btnH) / 2;

  const defs: Omit<ButtonDef, "x" | "y" | "h">[] = [
    {
      label: "待った",
      action: "takeback",
      w: 50,
      disabled: !state.canTakeBack || !state.isLive,
      style: "default",
    },
    {
      label: "◀",
      action: "stepBack",
      w: 28,
      disabled: !state.canStepBack,
      style: "default",
    },
    {
      label: "▶",
      action: "stepForward",
      w: 28,
      disabled: !state.canStepForward,
      style: "default",
    },
    {
      label: "▶▶",
      action: "goToLatest",
      w: 32,
      disabled: state.isLive,
      style: "default",
    },
  ];

  if (!state.isLive) {
    defs.push({
      label: "ここから再開",
      action: "resume",
      w: 80,
      disabled: false,
      style: "accent",
    });
  }

  const totalW =
    defs.reduce((s, d) => s + d.w, 0) + (defs.length - 1) * gap;
  let x = controls.x + (controls.w - totalW) / 2;

  return defs.map((d) => {
    const btn: ButtonDef = { ...d, x, y, h: btnH };
    x += d.w + gap;
    return btn;
  });
}

export function getActionButtons(layout: CanvasLayout): ButtonDef[] {
  const { actionButtons } = layout;
  const btnH = 24;
  const gap = 6;
  const y = actionButtons.y + (actionButtons.h - btnH) / 2;

  const defs: Omit<ButtonDef, "x" | "y" | "h">[] = [
    {
      label: "新しい対局",
      action: "reset",
      w: 70,
      disabled: false,
      style: "default",
    },
    {
      label: "設定",
      action: "settings",
      w: 40,
      disabled: false,
      style: "default",
    },
    {
      label: "トップへ",
      action: "back",
      w: 56,
      disabled: false,
      style: "subtle",
    },
  ];

  const totalW =
    defs.reduce((s, d) => s + d.w, 0) + (defs.length - 1) * gap;
  let x = actionButtons.x + (actionButtons.w - totalW) / 2;

  return defs.map((d) => {
    const btn: ButtonDef = { ...d, x, y, h: btnH };
    x += d.w + gap;
    return btn;
  });
}

export function getPromotionButtons(
  layout: CanvasLayout,
): { promote: Rect; decline: Rect } {
  const cx = layout.canvasW / 2;
  const cy = layout.canvasH / 2;
  const btnW = 70;
  const btnH = 36;
  const btnY = cy + 10;
  const gap = 16;

  return {
    promote: { x: cx - gap / 2 - btnW, y: btnY, w: btnW, h: btnH },
    decline: { x: cx + gap / 2, y: btnY, w: btnW, h: btnH },
  };
}
