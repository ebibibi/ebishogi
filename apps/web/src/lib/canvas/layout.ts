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
  /** 形勢グラフを盤の横（縦長パネル）に出しているか */
  evalGraphSide: boolean;
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
  dropRole?: Role;
  rank?: number;
  promotionLabel?: "成" | "不成";
};

export type ButtonDef = {
  label: string;
  action: string;
  x: number;
  y: number;
  w: number;
  h: number;
  disabled: boolean;
  hidden: boolean;
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
const INFO_H_MIN = 36;
const BTN_H = 28;
const GAP = 3;
const BOTTOM_PAD = 6;

/** 形勢グラフを盤の下に置くときの最大高さ。余った縦スペースまで伸ばす。 */
const EVAL_H_MAX = 110;
/** 盤の横に形勢グラフ（縦長パネル）を出すのに必要な最小幅。 */
const SIDE_MIN_W = 200;
const SIDE_MAX_W = 340;
const SIDE_GAP = 14;
/** サイドパネルを出すとき、画面端に残す余白。 */
const SIDE_MARGIN = 12;

/**
 * 盤のマスサイズと情報エリアの高さを求める。
 * 盤＋駒台は縦に 9 + 0.65*2 = 10.3 マス分を占める。
 *
 * @param availW 盤に使える横幅（サイドパネル分を差し引いた値）
 * @param evalRowH 縦スタックに積む形勢グラフの高さ。横に出すときは0
 */
function calcBoardMetrics(
  availW: number,
  vh: number,
  evalRowH: number,
): { cellSize: number; infoH: number } {
  const fromW = Math.floor(availW / 9);
  const gaps = GAP * (evalRowH > 0 ? 7 : 6);
  const baseFixed =
    CONTROLS_H + evalRowH + METER_H + BTN_H + gaps + BOTTOM_PAD;
  const estimate = Math.max(
    32,
    Math.min(Math.floor((vh - baseFixed - INFO_H_MIN) / 10.3), fromW),
  );
  const infoH = Math.max(INFO_H_MIN, Math.floor(estimate * 0.5));
  const fromH = Math.floor((vh - baseFixed - infoH) / 10.3);
  const cellSize = Math.max(32, Math.min(fromH, fromW));
  return { cellSize, infoH };
}

export function calcLayout(vw: number, vh: number): CanvasLayout {
  const dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // 形勢グラフの置き場所を決める。
  // 横長画面では盤の左右が余るので、そこへ縦長パネルとして出す
  // （横に長く上下に狭い帯だと、評価値の上下動が潰れて読めないため）。
  // 盤が小さくなるなら横出しはしない。
  // 下に置く場合の確保高さ。画面が縦に広いほど厚く取る
  // （30pxの帯だと横に長いだけで評価値の上下動が読めない）。
  const evalReserve = Math.min(
    EVAL_H_MAX,
    Math.max(EVAL_H, Math.round(vh * 0.09)),
  );
  const stacked = calcBoardMetrics(vw, vh, evalReserve);
  const side = calcBoardMetrics(
    vw - (SIDE_MIN_W + SIDE_GAP + SIDE_MARGIN * 2),
    vh,
    0,
  );
  const sideSpace =
    vw - side.cellSize * 9 - SIDE_GAP - SIDE_MARGIN * 2;
  const useSidePanel =
    sideSpace >= SIDE_MIN_W && side.cellSize >= stacked.cellSize;

  const { cellSize, infoH } = useSidePanel ? side : stacked;
  const boardPx = cellSize * 9;
  const handH = Math.ceil(cellSize * 0.65);
  const pieceSize = Math.floor(cellSize * 0.92);
  const handPieceSize = Math.max(18, Math.floor(cellSize * 0.5));

  const stackH = (evalRowH: number) =>
    handH * 2 +
    boardPx +
    CONTROLS_H +
    evalRowH +
    METER_H +
    infoH +
    BTN_H +
    GAP * (evalRowH > 0 ? 7 : 6) +
    BOTTOM_PAD;

  // 下に置く場合は、余った縦スペースをそのままグラフの高さに回す
  // （盤のサイズは既に確定しているので盤は縮まない）。
  const evalRowH = useSidePanel
    ? 0
    : Math.min(
        EVAL_H_MAX,
        evalReserve + Math.max(0, vh - stackH(evalReserve)),
      );

  const sidePanelW = useSidePanel
    ? Math.min(SIDE_MAX_W, Math.max(SIDE_MIN_W, sideSpace))
    : 0;
  const totalW =
    boardPx + (useSidePanel ? SIDE_GAP + sidePanelW : 0);
  const ox = Math.floor((vw - totalW) / 2);

  const contentW = boardPx;
  let y = 0;

  const topHand: Rect = { x: 0, y, w: contentW, h: handH };
  y += handH + GAP;
  const board: Rect = { x: 0, y, w: boardPx, h: boardPx };
  y += boardPx + GAP;
  const bottomHand: Rect = { x: 0, y, w: contentW, h: handH };
  const stackBottom = y + handH;
  y += handH + GAP;
  const controls: Rect = { x: 0, y, w: contentW, h: CONTROLS_H };
  y += CONTROLS_H + GAP;
  // 横出しのときは駒台を含めた盤全体の高さいっぱいに取る
  const evalGraph: Rect = useSidePanel
    ? {
        x: boardPx + SIDE_GAP,
        y: topHand.y,
        w: sidePanelW,
        h: stackBottom - topHand.y,
      }
    : { x: 0, y, w: contentW, h: evalRowH };
  if (!useSidePanel) y += evalRowH + GAP;
  const timerMeter: Rect = { x: 0, y, w: contentW, h: METER_H };
  y += METER_H + GAP;
  const infoArea: Rect = { x: 0, y, w: contentW, h: infoH };
  y += infoH + GAP;
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
    evalGraphSide: useSidePanel,
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

/**
 * 形勢グラフの折れ線を描く内側の領域。
 * 目盛りラベルの分だけ左右を削る。描画とクリック判定で同じ値を使うため
 * ここに集約する（ズレると別の手へジャンプしてしまう）。
 */
export function getEvalPlotArea(
  rect: Rect,
): Rect & { showDetail: boolean } {
  const pad = Math.min(8, Math.max(3, Math.floor(rect.h * 0.06)));
  const showDetail = rect.h >= 70;
  const labelW = showDetail ? 38 : 0;
  const rightPad = showDetail ? 6 : 0;
  return {
    x: rect.x + labelW,
    y: rect.y + pad,
    w: rect.w - labelW - rightPad,
    h: rect.h - pad * 2,
    showDetail,
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
      hidden: false,
      style: "default",
    },
    {
      label: "◀",
      action: "stepBack",
      w: 28,
      disabled: !state.canStepBack,
      hidden: false,
      style: "default",
    },
    {
      label: "▶",
      action: "stepForward",
      w: 28,
      disabled: !state.canStepForward,
      hidden: false,
      style: "default",
    },
    {
      label: "▶▶",
      action: "goToLatest",
      w: 32,
      disabled: state.isLive,
      hidden: false,
      style: "default",
    },
    {
      label: "ここから再開",
      action: "resume",
      w: 80,
      disabled: false,
      hidden: state.isLive,
      style: "accent",
    },
  ];

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
      hidden: false,
      style: "default",
    },
    {
      label: "設定",
      action: "settings",
      w: 40,
      disabled: false,
      hidden: false,
      style: "default",
    },
    {
      label: "トップへ",
      action: "back",
      w: 56,
      disabled: false,
      hidden: false,
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
