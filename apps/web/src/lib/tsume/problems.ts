/**
 * 詰将棋の問題集。SFEN と詰み手数のみを保持し、正解手順・受け方の応手・
 * ヒントはすべて solver が現局面から導出する。全問が生成時に
 * 「ちょうど mateIn 手・初手一意・無駄駒なし」で検証済み。
 */
import data from "./problems.json";

export type TsumeProblem = {
  /** 安定 ID（例 "t3-1"）。進捗保存のキーにも使う */
  id: string;
  /** 詰み手数（3 または 5、奇数） */
  mateIn: number;
  /** 開始局面（先手＝攻め方の手番） */
  sfen: string;
  /** 正解初手（USI）。ヒント・検証用 */
  firstMove: string;
};

export const PROBLEMS: readonly TsumeProblem[] = data.problems;

/** 指定手数の問題だけを出題順で返す。 */
export function problemsByMate(mateIn: number): readonly TsumeProblem[] {
  return PROBLEMS.filter((p) => p.mateIn === mateIn);
}

/** その手数の中で何問目か（1 始まり）。表示用。 */
export function problemIndex(problem: TsumeProblem): number {
  return problemsByMate(problem.mateIn).findIndex((p) => p.id === problem.id) + 1;
}

export const MATE_LEVELS: readonly number[] = [3, 5];
