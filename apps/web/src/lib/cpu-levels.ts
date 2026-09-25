// CPUの強さと、それに対応するエンジン探索の設定。
// 弱い段階は探索深さ(depth)と候補手の数で、上位段階は探索時間(timeMs)で強さを変える。

export type LevelSearch =
  | { readonly kind: "depth"; readonly depth: number }
  | { readonly kind: "time"; readonly timeMs: number };

export type CpuLevel = {
  readonly name: string;
  readonly description: string;
  readonly candidates: number;
  readonly search: LevelSearch;
};

export type EngineSearchOptions =
  | { readonly multiPV: number; readonly depth: number }
  | { readonly multiPV: number; readonly timeMs: number };

const depth = (d: number): LevelSearch => ({ kind: "depth", depth: d });
const time = (ms: number): LevelSearch => ({ kind: "time", timeMs: ms });

export const CPU_LEVELS: readonly CpuLevel[] = [
  { name: "10級", description: "ゆるく遊べる", candidates: 3, search: depth(1) },
  { name: "9級", description: "のんびり対局", candidates: 3, search: depth(1) },
  { name: "8級", description: "少し手ごたえあり", candidates: 3, search: depth(2) },
  { name: "7級", description: "駒の使い方を学ぶ", candidates: 2, search: depth(2) },
  { name: "6級", description: "攻めの形がわかる", candidates: 2, search: depth(3) },
  { name: "5級", description: "基本が身につく", candidates: 2, search: depth(3) },
  { name: "4級", description: "中盤力がつく", candidates: 1, search: depth(4) },
  { name: "3級", description: "戦いを楽しめる", candidates: 1, search: depth(5) },
  { name: "2級", description: "終盤が鋭くなる", candidates: 1, search: depth(6) },
  { name: "1級", description: "読みが深くなる", candidates: 1, search: depth(8) },
  { name: "初段", description: "本格的な将棋", candidates: 1, search: depth(10) },
  { name: "二段", description: "隙のない指し回し", candidates: 1, search: depth(12) },
  { name: "三段", description: "かなり手強い", candidates: 1, search: time(500) },
  { name: "四段", description: "アマ強豪クラス", candidates: 1, search: time(1500) },
  { name: "最強", description: "容赦なし", candidates: 1, search: time(3000) },
];

// 詰将棋の受け方は最善で粘ればよく、応手のテンポを優先して最強とは別に固定する。
export const TSUME_DEFENDER_SEARCH: EngineSearchOptions = {
  multiPV: 1,
  timeMs: 500,
};

export function getCpuLevel(index: number): CpuLevel {
  return CPU_LEVELS[index] ?? CPU_LEVELS[CPU_LEVELS.length - 1];
}

export function searchOptionsFor(level: CpuLevel): EngineSearchOptions {
  return level.search.kind === "depth"
    ? { multiPV: level.candidates, depth: level.search.depth }
    : { multiPV: level.candidates, timeMs: level.search.timeMs };
}

// 探索時間で強さを決める段階だけ、待ち時間の目安として思考時間を添える。
export function describeCpuLevel(level: CpuLevel): string {
  if (level.search.kind === "depth") return level.description;
  const seconds = level.search.timeMs / 1000;
  return `${level.description}（思考${seconds}秒）`;
}
