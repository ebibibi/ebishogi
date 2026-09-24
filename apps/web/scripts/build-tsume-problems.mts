/**
 * 実践詰将棋の問題集ビルドスクリプト（ワンショット生成・本番バンドルには含めない）
 *
 * やねうら王が公開した詰将棋500万問（パブリックドメイン・SFEN形式）
 *   https://yaneuraou.yaneu.com/2020/12/25/christmas-present/
 * から、3/5/7手詰を手数順に各 WANT 問取り込む。実戦由来なので「駒余りOK」。
 *
 * ★設計の要：正解手順(moves)を生成時に事前計算してデータに持たせる。
 *   実戦型は持ち駒が多く分岐が爆発し、ブラウザ内ソルバーでは5手1.5秒/7手4秒と
 *   重すぎる。そこで生成時に1本の正解手順（攻め＋受けの全手USI）を求めておき、
 *   実行時は「指し手が手順と一致するか」の照合だけにする（solver不要・即時）。
 *   重すぎる局面は探索ノード上限で打ち切ってスキップ（生成時間を制御）。
 *
 * solver.ts / shogi-game.ts は @/ エイリアスのため tsx から import できないので、
 * shogiops を直接使う自己完結版を持つ（探索ロジックは solver.ts と同一）。
 *
 * 実行: cd apps/web && ./node_modules/.bin/tsx scripts/build-tsume-problems.mts [WANT]
 */
import { Shogi } from "shogiops/variant/shogi";
import { parseSfen } from "shogiops/sfen";
import { makeUsi, squareRank } from "shogiops/util";
import type { MoveOrDrop, Piece, Role, Color, Square } from "shogiops/types";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// やねうらデータ(mate{N}.sfen)の置き場。TSUME_WORK で差し替え可能
const WORK = process.env.TSUME_WORK ?? "/home/ebi/tsume_work";
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/lib/tsume/problems.json",
);
const WANT = Number(process.argv.find((a) => /^\d+$/.test(a))) || 1000;
// 手数別の取り込み設定:
//   maxHand   = 攻め方の初期持ち駒の上限（駒余りOKだが極端な多さは探索が重いので除外）
//   scanLimit = 走査する行数の上限
//   nodeLimit = 1問の手順探索で展開してよい局面数の上限（超えたら重すぎる局面として捨てる）
const SETTINGS = [
  { mateIn: 3, maxHand: 8, scanLimit: 300_000, nodeLimit: 30_000 },
  { mateIn: 5, maxHand: 7, scanLimit: 800_000, nodeLimit: 80_000 },
  { mateIn: 7, maxHand: 4, scanLimit: 30_000, nodeLimit: 100_000 },
];
let CUR_LIMIT = 100_000;

// ── shogi-game.ts からの移植 ──
const PROMOTABLE: ReadonlySet<Role> = new Set<Role>([
  "pawn", "lance", "knight", "silver", "bishop", "rook",
]);
function canPromote(pos: Shogi, from: Square, to: Square): boolean {
  const piece = pos.board.get(from);
  if (!piece || !PROMOTABLE.has(piece.role)) return false;
  const fr = squareRank(from), tr = squareRank(to);
  return piece.color === "sente" ? fr <= 2 || tr <= 2 : fr >= 6 || tr >= 6;
}
function mustPromote(pos: Shogi, from: Square, to: Square): boolean {
  const piece = pos.board.get(from);
  if (!piece) return false;
  const tr = squareRank(to);
  if (piece.color === "sente") {
    if (piece.role === "pawn" || piece.role === "lance") return tr === 0;
    if (piece.role === "knight") return tr <= 1;
  } else {
    if (piece.role === "pawn" || piece.role === "lance") return tr === 8;
    if (piece.role === "knight") return tr >= 7;
  }
  return false;
}
function handPieces(pos: Shogi, color: Color): Map<Role, number> {
  const result = new Map<Role, number>();
  const hand = pos.hands[color];
  if (!hand) return result;
  for (const role of ["rook","bishop","gold","silver","knight","lance","pawn"] as Role[]) {
    const c = hand.get(role) ?? 0;
    if (c > 0) result.set(role, c);
  }
  return result;
}

// ── solver.ts からの移植（探索ノードを数えて上限で打ち切る）──
class Aborted extends Error {}
let NODES = 0;
function positionFromSfen(sfen: string): Shogi | null {
  const r = parseSfen("standard", sfen);
  return r.isErr ? null : (r.value as Shogi);
}
function isMated(pos: Shogi): boolean {
  return pos.isCheck() && !pos.hasDests();
}
function* legalMoves(pos: Shogi): Generator<MoveOrDrop> {
  const color = pos.turn;
  for (const [from, dests] of pos.allMoveDests()) {
    for (const to of dests) {
      if (mustPromote(pos, from, to)) yield { from, to, promotion: true };
      else if (canPromote(pos, from, to)) {
        yield { from, to, promotion: true };
        yield { from, to, promotion: false };
      } else yield { from, to, promotion: false };
    }
  }
  const hand = handPieces(pos, color);
  for (const role of hand.keys()) {
    const piece: Piece = { role, color };
    for (const to of pos.dropDests(piece)) yield { role, to };
  }
}
function applied(pos: Shogi, move: MoveOrDrop): Shogi {
  if (++NODES > CUR_LIMIT) throw new Aborted();
  const next = pos.clone() as Shogi;
  next.play(move);
  return next;
}
// 「depth 手以内に詰むか」だけを判定し、詰み筋が 1 本見つかった時点で打ち切る。
// 最短手数を求めて全王手を読み切る方式より桁違いに軽い（7手詰を現実的な時間で扱える）。
function attackerMatesWithin(pos: Shogi, depth: number): boolean {
  if (depth < 1) return false;
  for (const move of legalMoves(pos)) {
    const next = applied(pos, move);
    if (!next.isCheck()) continue;
    if (!next.hasDests()) return true;
    if (depth >= 3 && allDefensesMated(next, depth - 1)) return true;
  }
  return false;
}
function allDefensesMated(pos: Shogi, depth: number): boolean {
  let hasMove = false;
  for (const move of legalMoves(pos)) {
    hasMove = true;
    if (!attackerMatesWithin(applied(pos, move), depth - 1)) return false;
  }
  return hasMove;
}
/** depth 手以内に詰ませる攻め方の初手（最初に見つかったもの）。無ければ null。 */
function findMatingMove(pos: Shogi, depth: number): MoveOrDrop | null {
  for (const move of legalMoves(pos)) {
    const next = applied(pos, move);
    if (!next.isCheck()) continue;
    if (!next.hasDests()) return move;
    if (depth >= 3 && allDefensesMated(next, depth - 1)) return move;
  }
  return null;
}
/** 攻め方の手番の局面が何手で詰むか（1,3,..,maxDepth のうち最短）。詰まなければ -1。 */
function shortestMate(pos: Shogi, maxDepth: number): number {
  for (let d = 1; d <= maxDepth; d += 2) if (attackerMatesWithin(pos, d)) return d;
  return -1;
}
/** 最も長く粘る受け（逃れがあれば出題ミスとして null）。 */
function chooseDefense(pos: Shogi, depth: number): MoveOrDrop | null {
  let best: MoveOrDrop | null = null, bestLen = -1;
  for (const move of legalMoves(pos)) {
    const mate = shortestMate(applied(pos, move), depth - 1);
    if (mate < 0) return null;
    if (mate > bestLen) { bestLen = mate; best = move; }
  }
  return best;
}

// ── フィルタ本体 ──
type Problem = { id: string; mateIn: number; sfen: string; moves: string[] };

function senteHandCount(h: string): number {
  if (h === "-") return 0;
  let total = 0, num = "";
  for (const ch of h) {
    if (ch >= "0" && ch <= "9") { num += ch; continue; }
    const mult = num ? parseInt(num, 10) : 1;
    if (ch >= "A" && ch <= "Z") total += mult;
    num = "";
  }
  return total;
}

/**
 * ちょうど mateIn 手で詰む 1 本の正解手順(攻め＋受けの全手USI)を返す。
 * 詰まない・出題ミス・探索が重すぎる(NODE_LIMIT超過)場合は null。
 */
function solveLine(sfen: string, mateIn: number): string[] | null {
  const pos0 = positionFromSfen(sfen);
  if (!pos0 || pos0.turn !== "sente" || pos0.isCheck()) return null;
  NODES = 0;
  try {
    if (mateIn >= 3 && attackerMatesWithin(pos0, mateIn - 2)) return null; // より短い詰みがある
    let pos = pos0;
    let depth = mateIn;
    const moves: string[] = [];
    for (let step = 0; step < mateIn; step++) {
      const am = findMatingMove(pos, depth);
      if (!am) return null;
      moves.push(makeUsi(am));
      pos = applied(pos, am);
      if (isMated(pos)) return moves; // 詰み上がり
      const def = chooseDefense(pos, depth - 1);
      if (!def) return null;
      moves.push(makeUsi(def));
      pos = applied(pos, def);
      depth -= 2;
    }
    return null; // mateIn 手で詰みきらなかった（最短不一致）
  } catch (e) {
    if (e instanceof Aborted) return null;
    throw e;
  }
}

async function build(mateIn: number, maxHand: number, scanLimit: number, nodeLimit: number): Promise<Problem[]> {
  CUR_LIMIT = nodeLimit;
  const out: Problem[] = [];
  const rl = createInterface({
    input: createReadStream(`${WORK}/mate${mateIn}.sfen`),
    crlfDelay: Infinity,
  });
  let scanned = 0, aborted = 0;
  for await (const line of rl) {
    if (out.length >= WANT || scanned >= scanLimit) break;
    scanned++;
    const parts = line.split(" ");
    if (parts.length < 3 || parts[1] !== "b") continue;
    if (senteHandCount(parts[2]) > maxHand) continue;
    const sfen = `${parts[0]} b ${parts[2]} 1`;
    const moves = solveLine(sfen, mateIn);
    if (!moves || moves.length !== mateIn) {
      if (moves === null) aborted++;
      continue;
    }
    out.push({ id: `t${mateIn}-${out.length + 1}`, mateIn, sfen, moves });
  }
  rl.close();
  console.error(`  mate${mateIn}: scanned=${scanned} selected=${out.length} (skip/abort=${aborted})`);
  return out;
}

function formatJson(problems: Problem[]): string {
  const lines = problems.map((p) => `    ${JSON.stringify(p)}`);
  return `{\n  "problems": [\n${lines.join(",\n")}\n  ]\n}\n`;
}

/** 各手数の先頭を「移動が初手」の問題にして id を振り直す（E2Eの初手クリックを単純化）。 */
function reorder(data: Problem[]): Problem[] {
  const byMate = new Map<number, Problem[]>();
  for (const p of data) {
    if (!byMate.has(p.mateIn)) byMate.set(p.mateIn, []);
    byMate.get(p.mateIn)!.push(p);
  }
  const out: Problem[] = [];
  for (const [mateIn, list] of [...byMate.entries()].sort((a, b) => a[0] - b[0])) {
    const swap = list.findIndex((p) => p.moves[0] && !p.moves[0].includes("*"));
    if (swap > 0) { const t = list[swap]; list.splice(swap, 1); list.unshift(t); }
    list.forEach((p, i) => { p.id = `t${mateIn}-${i + 1}`; });
    out.push(...list);
  }
  return out;
}

if (process.argv.includes("--fixture-only")) {
  // 重い再生成をせず、生成済み problems.json を整形だけする（先頭を移動初手に）
  const data = JSON.parse(readFileSync(OUT, "utf8")).problems as Problem[];
  writeFileSync(OUT, formatJson(reorder(data)));
  console.error(`整形完了: 計=${data.length}`);
} else if (process.argv.includes("--append-mate7")) {
  // 既存(3/5手)を保ったまま、7手だけ生成して追記する
  const existing = JSON.parse(readFileSync(OUT, "utf8")).problems as Problem[];
  const base = existing.filter((p) => p.mateIn !== 7);
  const s7 = SETTINGS.find((s) => s.mateIn === 7)!;
  const m7 = await build(7, s7.maxHand, s7.scanLimit, s7.nodeLimit);
  writeFileSync(OUT, formatJson(reorder([...base, ...m7])));
  console.error(`mate7追加: ${m7.length}問`);
} else {
  console.error(`実践詰将棋を生成中（やねうら王500万問 → 各手数${WANT}問・正解手順付き）...`);
  const all: Problem[] = [];
  for (const s of SETTINGS) {
    all.push(...(await build(s.mateIn, s.maxHand, s.scanLimit, s.nodeLimit)));
    writeFileSync(OUT, formatJson(reorder(all))); // 手数ごとに途中保存（重い手数で詰んでも前の成果を守る）
    console.error(`  → 途中保存（計${all.length}問）`);
  }
  const reordered = reorder(all);
  writeFileSync(OUT, formatJson(reordered));
  const counts = SETTINGS.map((s) => `${s.mateIn}手=${reordered.filter((p) => p.mateIn === s.mateIn).length}`).join(" ");
  console.error(`完了: ${counts} 計=${reordered.length} → ${OUT}`);
}
