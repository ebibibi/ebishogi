/**
 * 詰将棋の進行管理。攻め方（人間・先手）の手を、事前計算された正解手順
 * （problem.moves）と照合する。正解なら受け方の応手を手順から指して進める。
 * 状態は常に新しいオブジェクトを返す（イミュータブル）。
 *
 * 正解手順を持つので実行時のソルバー探索は不要。実戦型の重い局面でも即時に
 * 判定できる（moves は scripts/build-tsume-problems.mts が生成時に求める）。
 */
import { Shogi } from "shogiops/variant/shogi";
import { parseSfen } from "shogiops/sfen";
import { parseUsi, makeUsi } from "shogiops/util";
import type { MoveOrDrop } from "shogiops/types";
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
  const result = parseSfen("standard", problem.sfen);
  if (result.isErr) throw new Error(`不正な SFEN: ${problem.sfen}`);
  return {
    problem,
    position: result.value as Shogi,
    ply: 0,
    status: "playing",
    lastMove: null,
  };
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
 * 攻め方の手を正解手順と照合する。正解なら受け方の応手まで進めた新 state を返す。
 * 不正解なら state は変えず message を返す。
 */
export function playAttackerMove(
  state: TsumeState,
  move: MoveOrDrop,
): MoveOutcome {
  if (state.status !== "playing") {
    return { type: "wrong", message: "この問題は終了しています" };
  }

  const i = state.ply * 2;
  const expected = state.problem.moves[i];
  if (!expected || makeUsi(move) !== expected) {
    return { type: "wrong", message: "その手は正解ではありません" };
  }

  const pos = state.position.clone() as Shogi;
  pos.play(move);
  const ply = state.ply + 1;

  // 受け方の応手が手順に無ければ詰み上がり
  const defenseUsi = state.problem.moves[i + 1];
  const defenseMove = defenseUsi ? parseUsi(defenseUsi) : undefined;
  if (!defenseMove) {
    return {
      type: "solved",
      state: { ...state, position: pos, ply, status: "solved", lastMove: move },
    };
  }

  pos.play(defenseMove);
  return {
    type: "correct",
    state: { ...state, position: pos, ply, status: "playing", lastMove: defenseMove },
  };
}

/** 現局面の正解手（USI）。ヒントに使う。手順を終えていれば null。 */
export function currentBestMove(state: TsumeState): string | null {
  return state.problem.moves[state.ply * 2] ?? null;
}
