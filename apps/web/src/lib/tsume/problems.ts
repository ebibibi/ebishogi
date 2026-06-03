/**
 * 実践詰将棋の問題集。各問は開始局面(sfen)と正解手順(moves)を持つ。
 * 対局自体は GameView（将棋エンジン）で行い、攻め方は自由に指せて受け方は
 * エンジンが最善で応じる（余詰めも間違いも自然に扱える）。moves は正解手順の
 * 記録で、E2Eの初手・問題の並べ替え（先頭を移動初手に）・将来のヒント等に使う。
 *
 * 出典: やねうら王が公開した詰将棋500万問（パブリックドメイン・SFEN形式）
 *   https://yaneuraou.yaneu.com/2020/12/25/christmas-present/
 * から 3・5 手詰を手数順に取り込んだ実戦由来の問題（駒余りあり＝実践詰将棋）。
 * 7手詰は scripts/build-tsume-problems.mts --append-mate7 で後日追加予定。
 */
import data from "./problems.json";

export type TsumeProblem = {
  /** 安定 ID（例 "t3-1"）。進捗・解答回数の保存キーにも使う */
  id: string;
  /** 詰み手数（3・5・7 の奇数） */
  mateIn: number;
  /** 開始局面（先手＝攻め方の手番） */
  sfen: string;
  /** 正解手順（攻め＋受けの全手 USI）。index 偶数=攻め方、奇数=受け方、先頭が初手。 */
  moves: string[];
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

// 7手詰はソルバーでの正解手順事前計算が重く生成に時間がかかるため後日追加予定。
export const MATE_LEVELS: readonly number[] = [3, 5];
