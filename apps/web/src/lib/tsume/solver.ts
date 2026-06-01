/**
 * 詰将棋ソルバー（shogiops ベース、UI 無依存）
 *
 * 設計の核心:
 *   攻め方が一手指したあと `pos.isCheck() && !pos.hasDests()` が真なら「詰み」。
 *   攻め方は常に王手を続け（詰将棋のルール）、受け方は合法手すべてで逃れを試みる。
 *   この AND/OR 探索だけで、正解判定・受け方の応手・ヒント・問題検証がすべて賄える。
 *
 * 3手・5手という浅い探索なので分岐は小さく、ブラウザ内でも一瞬で解ける。
 */
import { Shogi } from "shogiops/variant/shogi";
import { parseSfen } from "shogiops/sfen";
import { makeUsi } from "shogiops/util";
import type { MoveOrDrop, Piece } from "shogiops/types";
import { canPromote, mustPromote, getHandPieces } from "@/lib/shogi-game";

/** SFEN を Shogi 局面に変換。失敗時は null。 */
export function positionFromSfen(sfen: string): Shogi | null {
  const result = parseSfen("standard", sfen);
  if (result.isErr) return null;
  return result.value as Shogi;
}

/** 手番のプレイヤーが詰んでいるか（王手されていて合法手が無い）。 */
export function isMated(pos: Shogi): boolean {
  return pos.isCheck() && !pos.hasDests();
}

/**
 * 現局面（手番のプレイヤー）の合法手をすべて列挙する。
 * 盤上の駒は成り・不成の両方を、強制成りの場合は成りのみを生成する。
 * allMoveDests / dropDests は自殺手・打ち歩詰めを除外済みなので、ここでは
 * 成り不成の分岐だけ正しく扱えばよい。
 */
function* legalMoves(pos: Shogi): Generator<MoveOrDrop> {
  const color = pos.turn;

  for (const [from, dests] of pos.allMoveDests()) {
    for (const to of dests) {
      if (mustPromote(pos, from, to)) {
        yield { from, to, promotion: true };
      } else if (canPromote(pos, from, to)) {
        yield { from, to, promotion: true };
        yield { from, to, promotion: false };
      } else {
        yield { from, to, promotion: false };
      }
    }
  }

  const hand = getHandPieces(pos, color);
  for (const role of hand.keys()) {
    const piece: Piece = { role, color };
    for (const to of pos.dropDests(piece)) {
      yield { role, to };
    }
  }
}

function applied(pos: Shogi, move: MoveOrDrop): Shogi {
  const next = pos.clone() as Shogi;
  next.play(move);
  return next;
}

/**
 * 攻め方の手番。`depth` 手以内に詰む最短手数（必ず奇数）を返す。詰まなければ -1。
 * 攻め方は最短で詰ますものとして探索する。
 */
function attackerShortestMate(pos: Shogi, depth: number): number {
  if (depth < 1) return -1;
  let best = -1;
  for (const move of legalMoves(pos)) {
    const next = applied(pos, move);
    if (!next.isCheck()) continue; // 攻め方は王手を続けねばならない
    if (!next.hasDests()) return 1; // この一手で詰み（最短）
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

/**
 * 受け方の手番。すべての応手で攻め方が詰ませられるなら、最も粘った（最長の）
 * 詰み手数を返す。一つでも逃れがあれば -1。
 */
function defenderLongestMate(pos: Shogi, depth: number): number {
  let longest = -1;
  let hasMove = false;
  for (const move of legalMoves(pos)) {
    hasMove = true;
    const next = applied(pos, move);
    const mate = attackerShortestMate(next, depth - 1);
    if (mate < 0) return -1; // 逃れる受けがある → 不詰
    const total = mate + 1;
    if (total > longest) longest = total;
  }
  return hasMove ? longest : -1;
}

/**
 * 攻め方の手番で「`depth` 手以内に詰む初手」をすべて返す（USI 文字列）。
 * 正解判定とヒントに用いる。余詰め（複数の正解初手）も拾う。
 */
export function findMatingMoves(pos: Shogi, depth: number): string[] {
  const result: string[] = [];
  for (const move of legalMoves(pos)) {
    const next = applied(pos, move);
    if (!next.isCheck()) continue;
    if (!next.hasDests()) {
      result.push(makeUsi(move));
      continue;
    }
    if (depth >= 3 && defenderLongestMate(next, depth - 1) >= 0) {
      result.push(makeUsi(move));
    }
  }
  return result;
}

/**
 * 受け方の手番で最善（最も長く粘る）応手を返す（USI 文字列）。
 * 攻め方が必ず詰ませられる前提だが、万一逃れがあればそれを最優先で返す
 * （出題ミスの検出に使える）。手が無ければ null。
 */
export function chooseDefense(pos: Shogi, depth: number): string | null {
  let best: MoveOrDrop | null = null;
  let bestLen = -1;
  for (const move of legalMoves(pos)) {
    const next = applied(pos, move);
    const mate = attackerShortestMate(next, depth - 1);
    if (mate < 0) return makeUsi(move); // 逃れ → 即返す
    if (mate > bestLen) {
      bestLen = mate;
      best = move;
    }
  }
  return best ? makeUsi(best) : null;
}

export type VerifyResult = {
  ok: boolean;
  /** 実際にちょうど詰む最短手数（-1 は不詰） */
  shortestMate: number;
  /** 正解初手の数（1 なら初手一意、2 以上は余詰め） */
  firstMoveCount: number;
  reason?: string;
};

/**
 * 問題の健全性を検証する。
 *   - SFEN が解釈でき、攻め方の手番である
 *   - 初形は王手がかかっていない（詰将棋の作法）
 *   - ちょうど `mateIn` 手で詰む（より短い詰みが無い）
 */
export function verifyProblem(sfen: string, mateIn: number): VerifyResult {
  const pos = positionFromSfen(sfen);
  if (!pos) {
    return { ok: false, shortestMate: -1, firstMoveCount: 0, reason: "SFEN parse error" };
  }
  if (pos.isCheck()) {
    return {
      ok: false,
      shortestMate: -1,
      firstMoveCount: 0,
      reason: "初形で王手がかかっている",
    };
  }
  const shortest = attackerShortestMate(pos, mateIn);
  if (shortest < 0) {
    return { ok: false, shortestMate: -1, firstMoveCount: 0, reason: "詰まない" };
  }
  if (shortest !== mateIn) {
    return {
      ok: false,
      shortestMate: shortest,
      firstMoveCount: 0,
      reason: `最短 ${shortest} 手で詰む（指定 ${mateIn} 手と不一致）`,
    };
  }
  const firsts = findMatingMoves(pos, mateIn);
  return { ok: true, shortestMate: shortest, firstMoveCount: firsts.length };
}
