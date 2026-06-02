/**
 * 詰将棋問題集ビルドスクリプト（ワンショット生成・本番バンドルには含めない）
 *
 * やねうら王が2020年に公開した詰将棋500万問（パブリックドメイン, SFEN）
 *   https://yaneuraou.yaneu.com/2020/12/25/christmas-present/
 * から、ebishogi の作法に合う良問だけを厳選して problems.json を生成する。
 *
 * 選定条件:
 *   1. 手番が先手(b) = 攻め方が先手（problems.ts の前提に合致、先後反転が不要）
 *   2. 攻め方の初期持ち駒が少ない（軽量プレフィルタ。実戦的すぎる局面を除外）
 *   3. 初形で王手がかかっていない（詰将棋の作法）
 *   4. ちょうど mateIn 手で詰む & 初手が一意（= 余詰めなし）
 *   5. 詰め上がりで攻め方の持ち駒がゼロ（= 「持ち駒余り」の排除。作法）
 *   6. 初手パターンの多様性（同一パターンの偏りを抑える）
 *
 * solver.ts / shogi-game.ts は @/ エイリアスを使い tsx から直接 import できない
 * ため、ここでは shogiops を直接使う自己完結版を持つ（探索ロジックは solver.ts
 * と同一。生成物は本番 solver の E2E/検証で担保する）。
 *
 * 実行: cd apps/web && npx tsx scripts/build-tsume-problems.mts
 */
import { Shogi } from "shogiops/variant/shogi";
import { parseSfen } from "shogiops/sfen";
import { makeUsi, parseUsi, squareRank } from "shogiops/util";
import type { MoveOrDrop, Piece, Role, Color, Square } from "shogiops/types";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  calcTsumeLayout,
  fileRankToXY,
  handSlotPositions,
} from "../src/lib/tsume/tsume-layout";

const WORK = "/home/ebi/tsume_work";
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/lib/tsume/problems.json",
);

// ── shogi-game.ts からの移植（shogiops 薄ラッパー）──
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

// ── solver.ts からの移植（AND/OR 詰み探索）──
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
  const next = pos.clone() as Shogi;
  next.play(move);
  return next;
}
function attackerShortestMate(pos: Shogi, depth: number): number {
  if (depth < 1) return -1;
  let best = -1;
  for (const move of legalMoves(pos)) {
    const next = applied(pos, move);
    if (!next.isCheck()) continue;
    if (!next.hasDests()) return 1;
    if (depth >= 3) {
      const reply = defenderLongestMate(next, depth - 1);
      if (reply >= 0) {
        const total = reply + 1;
        if (best < 0 || total < best) best = total;
      }
    }
  }
  return best;
}
function defenderLongestMate(pos: Shogi, depth: number): number {
  let longest = -1, hasMove = false;
  for (const move of legalMoves(pos)) {
    hasMove = true;
    const next = applied(pos, move);
    const mate = attackerShortestMate(next, depth - 1);
    if (mate < 0) return -1;
    const total = mate + 1;
    if (total > longest) longest = total;
  }
  return hasMove ? longest : -1;
}
function findMatingMoves(pos: Shogi, depth: number): string[] {
  const result: string[] = [];
  for (const move of legalMoves(pos)) {
    const next = applied(pos, move);
    if (!next.isCheck()) continue;
    if (!next.hasDests()) { result.push(makeUsi(move)); continue; }
    if (depth >= 3 && defenderLongestMate(next, depth - 1) >= 0) {
      result.push(makeUsi(move));
    }
  }
  return result;
}
function chooseDefense(pos: Shogi, depth: number): MoveOrDrop | null {
  let best: MoveOrDrop | null = null, bestLen = -1;
  for (const move of legalMoves(pos)) {
    const next = applied(pos, move);
    const mate = attackerShortestMate(next, depth - 1);
    if (mate < 0) return move; // 逃れがある=出題ミス
    if (mate > bestLen) { bestLen = mate; best = move; }
  }
  return best;
}

// ── フィルタ本体 ──
type Problem = { id: string; mateIn: number; sfen: string; firstMove: string };

/** SFEN 持ち駒文字列のうち先手（大文字）の枚数を数える。'-' は 0。 */
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

/** 初形が「攻め方先手・初形王手なし・ちょうど mateIn 手・初手一意」か。 */
function verify(sfen: string, mateIn: number): string | null {
  const pos = positionFromSfen(sfen);
  if (!pos || pos.turn !== "sente" || pos.isCheck()) return null;
  if (attackerShortestMate(pos, mateIn) !== mateIn) return null;
  const firsts = findMatingMoves(pos, mateIn);
  return firsts.length === 1 ? firsts[0] : null; // 初手一意のみ
}

/** 正解手順を再生し、詰め上がりで攻め方の持ち駒がゼロなら true。 */
function handEmptyAtMate(sfen: string, mateIn: number): boolean {
  let pos = positionFromSfen(sfen);
  if (!pos) return false;
  const attacker = pos.turn; // sente
  let depth = mateIn;
  for (let guard = 0; guard < 20; guard++) {
    const firsts = findMatingMoves(pos, depth);
    if (firsts.length === 0) return false;
    const attack = parseUsi(firsts[0]);
    if (!attack) return false;
    pos = applied(pos, attack);
    if (isMated(pos)) break;
    const def = chooseDefense(pos, depth - 1);
    if (!def) return false;
    pos = applied(pos, def);
    depth -= 2;
  }
  return handPieces(pos, attacker).size === 0;
}

/** 初手 USI から多様性キー（駒種・打/移動・段）を作る。数字の一部を残す。 */
function firstKey(usi: string): string {
  // 例 "G*8c" -> "G*c"（金打・3段目）, "7g7f" -> "gf"（移動の段）
  return usi.replace(/[0-9]/g, "");
}

async function build(
  path: string,
  mateIn: number,
  want: number,
  maxHand: number,
  scanLimit: number,
): Promise<Problem[]> {
  const out: Problem[] = [];
  const keyCount = new Map<string, number>();
  const keyCap = Math.ceil(want / 5); // 同一パターンは全体の 1/5 まで
  const rl = createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });
  let scanned = 0;
  for await (const line of rl) {
    if (out.length >= want || scanned >= scanLimit) break;
    scanned++;
    const parts = line.split(" ");
    if (parts.length < 3 || parts[1] !== "b") continue;
    if (senteHandCount(parts[2]) > maxHand) continue;
    const sfen = `${parts[0]} b ${parts[2]} 1`;
    const first = verify(sfen, mateIn);
    if (!first) continue;
    if (!handEmptyAtMate(sfen, mateIn)) continue;
    const key = firstKey(first);
    if ((keyCount.get(key) ?? 0) >= keyCap) continue;
    keyCount.set(key, (keyCount.get(key) ?? 0) + 1);
    out.push({ id: `t${mateIn}-${out.length + 1}`, mateIn, sfen, firstMove: first });
  }
  rl.close();
  console.error(`  mate${mateIn}: scanned=${scanned} selected=${out.length}`);
  return out;
}

function formatJson(problems: Problem[]): string {
  const lines = problems.map((p) => `    ${JSON.stringify(p)}`);
  return `{\n  "problems": [\n${lines.join(",\n")}\n  ]\n}\n`;
}

// ── 実行 ──
// --fixture-only: 既存 problems.json を読んでフィクスチャだけ再生成する
// （重い mate5 スキャンを省く。problems.json を作り直すときは引数なしで実行）
let p3: Problem[];
if (process.argv.includes("--fixture-only")) {
  const data = JSON.parse(readFileSync(OUT, "utf8")).problems as Problem[];
  p3 = data.filter((p) => p.mateIn === 3);
  console.error(`既存 problems.json を読込: 3手=${p3.length}問`);
} else {
  console.error("詰将棋を厳選中（やねうら王500万問 → 良問抽出）...");
  p3 = await build(`${WORK}/mate3.sfen`, 3, 30, 2, 300_000);
  const p5 = await build(`${WORK}/mate5.sfen`, 5, 30, 3, 600_000);
  const all = [...p3, ...p5];
  writeFileSync(OUT, formatJson(all));
  console.error(`完了: 3手=${p3.length} 5手=${p5.length} 計=${all.length} → ${OUT}`);
}

// ── E2E テスト用フィクスチャ ────────────────────────────────
// 成りを含まない手順の3手詰を1問選び、攻め方の各手を
// TsumeBoard と同じレイアウト（viewport 1280x720 → vw=460,vh=460.8,cell=44）
// のクリック座標列に変換して出力する。problems.json を再生成すると
// フィクスチャも更新されるので、tsume.spec.ts は内容非依存で保てる。
const DROP_ROLE: Record<string, Role> = {
  R: "rook", B: "bishop", G: "gold", S: "silver",
  N: "knight", L: "lance", P: "pawn",
};
const LAYOUT = calcTsumeLayout(460, 720 * 0.64);

function squareToClick(file: number, rank: number) {
  const p = fileRankToXY(file, rank, LAYOUT.board, LAYOUT.cell);
  return {
    x: Math.round(p.x + LAYOUT.cell / 2),
    y: Math.round(p.y + LAYOUT.cell / 2),
  };
}
function handToClick(pos: Shogi, role: Role) {
  const slots = handSlotPositions(
    LAYOUT.bottomHand, handPieces(pos, "sente"), LAYOUT.handPieceSize, true,
  );
  const slot = slots.find((s) => s.role === role);
  if (!slot) return null;
  return {
    x: Math.round(slot.x + slot.w / 2),
    y: Math.round(LAYOUT.bottomHand.y + LAYOUT.bottomHand.h / 2),
  };
}
// USI のマス表記 "6e" → { file:6, rank:5 }（段 a=1 … i=9）
function usiSquare(tok: string) {
  return { file: Number(tok[0]), rank: tok.charCodeAt(1) - 96 };
}

/** 攻め方の各手を順にクリック座標へ。成りを含む手順は null（座標が複雑なため不採用）。 */
function tracedClicks(sfen: string, mateIn: number): { x: number; y: number }[] | null {
  let pos = positionFromSfen(sfen);
  if (!pos) return null;
  let depth = mateIn;
  const clicks: { x: number; y: number }[] = [];
  for (let guard = 0; guard < 20; guard++) {
    const firsts = findMatingMoves(pos, depth);
    if (firsts.length !== 1) return null;
    const usi = firsts[0];
    if (usi.includes("+")) return null; // 成り手は除外
    if (usi.includes("*")) {
      const drop = handToClick(pos, DROP_ROLE[usi[0]]);
      const sq = usiSquare(usi.slice(2));
      if (!drop) return null;
      clicks.push(drop, squareToClick(sq.file, sq.rank));
    } else {
      const from = usiSquare(usi.slice(0, 2));
      const to = usiSquare(usi.slice(2, 4));
      clicks.push(squareToClick(from.file, from.rank), squareToClick(to.file, to.rank));
    }
    const mv = parseUsi(usi);
    if (!mv) return null;
    pos = applied(pos, mv);
    if (isMated(pos)) break;
    const def = chooseDefense(pos, depth - 1);
    if (!def) return null;
    pos = applied(pos, def);
    depth -= 2;
  }
  return clicks;
}

let fixture: unknown = null;
for (let i = 0; i < p3.length; i++) {
  const clicks = tracedClicks(p3[i].sfen, 3);
  if (clicks) {
    fixture = { mateIn: 3, problemNumber: i + 1, sfen: p3[i].sfen, clicks };
    break;
  }
}
if (fixture) {
  const fxPath = join(
    dirname(fileURLToPath(import.meta.url)), "../../../e2e/tsume-fixture.json",
  );
  writeFileSync(fxPath, JSON.stringify(fixture, null, 2) + "\n");
  console.error(`fixture: ${JSON.stringify(fixture).slice(0, 80)}… → ${fxPath}`);
} else {
  console.error("warning: フィクスチャに使える成りなし3手詰が見つからない");
}
