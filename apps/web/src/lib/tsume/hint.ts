/**
 * 指し手の日本語表記と、段階的ヒントの生成。
 * ヒントは現局面の正解初手（solver 由来）から作るので、途中局面でも機能する。
 */
import type { Shogi } from "shogiops/variant/shogi";
import { parseUsi, squareFile, squareRank } from "shogiops/util";
import { type TsumeState } from "./tsume-game";

const FILE_KANJI = ["１", "２", "３", "４", "５", "６", "７", "８", "９"];
const RANK_KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

const ROLE_KANJI: Record<string, string> = {
  king: "玉",
  rook: "飛",
  bishop: "角",
  gold: "金",
  silver: "銀",
  knight: "桂",
  lance: "香",
  pawn: "歩",
  tokin: "と",
  dragon: "竜",
  horse: "馬",
  promotedsilver: "成銀",
  promotedknight: "成桂",
  promotedlance: "成香",
};

function squareKanji(sq: number): string {
  return FILE_KANJI[squareFile(sq)] + RANK_KANJI[squareRank(sq)];
}

/** USI を「８三金打」「７六歩成」のような日本語表記に変換する。 */
export function usiToJapanese(usi: string, pos: Shogi): string {
  const md = parseUsi(usi);
  if (!md) return usi;
  if ("role" in md) {
    return squareKanji(md.to) + (ROLE_KANJI[md.role] ?? "") + "打";
  }
  const role = pos.board.get(md.from)?.role;
  const name = role ? (ROLE_KANJI[role] ?? "") : "";
  return squareKanji(md.to) + name + (md.promotion ? "成" : "");
}

export type StagedHint = {
  /** 使う駒（例「金を使います」） */
  piece: string;
  /** 狙いのマス（例「８三 がねらい目」） */
  square: string;
  /** 初手そのもの（例「初手は ８三金打」） */
  move: string;
};

/** 現局面の正解手（手順から取得）から 3 段階のヒントを作る。手順末尾なら null。 */
export function buildHints(state: TsumeState): StagedHint | null {
  const usi = state.problem.moves[state.ply * 2];
  if (!usi) return null;
  const md = parseUsi(usi);
  if (!md) return null;

  let pieceName: string;
  let squareName: string;
  if ("role" in md) {
    pieceName = ROLE_KANJI[md.role] ?? "";
    squareName = squareKanji(md.to);
  } else {
    const role = state.position.board.get(md.from)?.role;
    pieceName = role ? (ROLE_KANJI[role] ?? "") : "";
    squareName = squareKanji(md.to);
  }

  return {
    piece: `${pieceName}を使います`,
    square: `${squareName} がねらい目`,
    move: `初手は ${usiToJapanese(usi, state.position)}`,
  };
}
