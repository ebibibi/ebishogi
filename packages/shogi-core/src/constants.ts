import type { AnyPieceType, PieceType, PromotedPieceType } from "./types";

export const BOARD_SIZE = 9;

export const PROMOTION_MAP: Readonly<
  Record<string, PromotedPieceType | undefined>
> = {
  rook: "promotedRook",
  bishop: "promotedBishop",
  silver: "promotedSilver",
  knight: "promotedKnight",
  lance: "promotedLance",
  pawn: "promotedPawn",
};

export const DEMOTION_MAP: Readonly<Record<string, PieceType | undefined>> = {
  promotedRook: "rook",
  promotedBishop: "bishop",
  promotedSilver: "silver",
  promotedKnight: "knight",
  promotedLance: "lance",
  promotedPawn: "pawn",
};

export function promote(pieceType: PieceType): PromotedPieceType | undefined {
  return PROMOTION_MAP[pieceType];
}

export function demote(pieceType: AnyPieceType): PieceType {
  return DEMOTION_MAP[pieceType] ?? (pieceType as PieceType);
}

export function isPromoted(pieceType: AnyPieceType): boolean {
  return pieceType in DEMOTION_MAP;
}

export const PIECE_KANJI: Readonly<Record<AnyPieceType, string>> = {
  king: "玉",
  rook: "飛",
  bishop: "角",
  gold: "金",
  silver: "銀",
  knight: "桂",
  lance: "香",
  pawn: "歩",
  promotedRook: "龍",
  promotedBishop: "馬",
  promotedSilver: "成銀",
  promotedKnight: "成桂",
  promotedLance: "成香",
  promotedPawn: "と",
};

export const SFEN_PIECE_MAP: Readonly<Record<string, AnyPieceType>> = {
  K: "king",
  R: "rook",
  B: "bishop",
  G: "gold",
  S: "silver",
  N: "knight",
  L: "lance",
  P: "pawn",
  "+R": "promotedRook",
  "+B": "promotedBishop",
  "+S": "promotedSilver",
  "+N": "promotedKnight",
  "+L": "promotedLance",
  "+P": "promotedPawn",
};

export const PIECE_TO_SFEN: Readonly<Record<AnyPieceType, string>> = {
  king: "K",
  rook: "R",
  bishop: "B",
  gold: "G",
  silver: "S",
  knight: "N",
  lance: "L",
  pawn: "P",
  promotedRook: "+R",
  promotedBishop: "+B",
  promotedSilver: "+S",
  promotedKnight: "+N",
  promotedLance: "+L",
  promotedPawn: "+P",
};
