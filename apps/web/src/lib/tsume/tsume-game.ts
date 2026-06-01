/**
 * 詰将棋の進行管理。攻め方（人間・先手）の手を検証し、正解なら受け方の
 * 最善応手を自動で指して詰みを判定する。状態は常に新しいオブジェクトを返す
 * （イミュータブル）。盤面ロジックは solver 経由で shogiops に委ねる。
 */
import { Shogi } from "shogiops/variant/shogi";
import { parseUsi, makeUsi } from "shogiops/util";
import type { MoveOrDrop } from "shogiops/types";
import {
  positionFromSfen,
  isMated,
  findMatingMoves,
  chooseDefense,
} from "./solver";
import type { TsumeProblem } from "./problems";

export type TsumeStatus = "playing" | "solved";

export type TsumeState = {
  problem: TsumeProblem;
  position: Shogi;
  /** 攻め方が指した正解手の数 */
  ply: number;
  status: TsumeStatus;
  /** 直前に盤に現れた手（攻め方手 or 受け方の応手）。ハイライト用 */
  lastMove: MoveOrDrop | null;
};

export function startProblem(problem: TsumeProblem): TsumeState {
  const position = positionFromSfen(problem.sfen);
  if (!position) throw new Error(`不正な SFEN: ${problem.sfen}`);
  return { problem, position, ply: 0, status: "playing", lastMove: null };
}

/** 現局面で攻め方があと何手で詰ますべきか（残り手数）。 */
export function remainingMate(state: TsumeState): number {
  return state.problem.mateIn - state.ply * 2;
}

export type MoveOutcome =
  | { type: "solved"; state: TsumeState }
  | { type: "correct"; state: TsumeState }
  | { type: "wrong"; message: string };

/**
 * 攻め方の手を試す。正解なら受け方の応手まで進めた新 state を返す。
 * 不正解なら state は変えず message を返す。
 */
export function playAttackerMove(
  state: TsumeState,
  move: MoveOrDrop,
): MoveOutcome {
  if (state.status !== "playing") {
    return { type: "wrong", message: "この問題は終了しています" };
  }

  const depth = remainingMate(state);
  const mating = findMatingMoves(state.position, depth);
  if (!mating.includes(makeUsi(move))) {
    return { type: "wrong", message: "その手では詰みません" };
  }

  const afterAttack = state.position.clone() as Shogi;
  afterAttack.play(move);
  const ply = state.ply + 1;

  if (isMated(afterAttack)) {
    return {
      type: "solved",
      state: { ...state, position: afterAttack, ply, status: "solved", lastMove: move },
    };
  }

  // 受け方（後手）の最も粘る応手を自動で指す
  const defenseUsi = chooseDefense(afterAttack, depth - 1);
  const defenseMove = defenseUsi ? parseUsi(defenseUsi) : undefined;
  if (!defenseMove) {
    // 応手が無い＝実質詰み。保険的に solved 扱い。
    return {
      type: "solved",
      state: { ...state, position: afterAttack, ply, status: "solved", lastMove: move },
    };
  }
  const afterDefense = afterAttack.clone() as Shogi;
  afterDefense.play(defenseMove);

  return {
    type: "correct",
    state: { ...state, position: afterDefense, ply, status: "playing", lastMove: defenseMove },
  };
}

/** 現局面の正解初手（USI）。ヒントに使う。詰みが無ければ null。 */
export function currentBestMove(state: TsumeState): string | null {
  const mating = findMatingMoves(state.position, remainingMate(state));
  return mating[0] ?? null;
}
