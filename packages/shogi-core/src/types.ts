export const COLORS = ["sente", "gote"] as const;
export type Color = (typeof COLORS)[number];

export const PIECE_TYPES = [
  "king",
  "rook",
  "bishop",
  "gold",
  "silver",
  "knight",
  "lance",
  "pawn",
] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export const PROMOTED_PIECE_TYPES = [
  "promotedRook",
  "promotedBishop",
  "promotedSilver",
  "promotedKnight",
  "promotedLance",
  "promotedPawn",
] as const;
export type PromotedPieceType = (typeof PROMOTED_PIECE_TYPES)[number];

export type AnyPieceType = PieceType | PromotedPieceType;

export type Piece = Readonly<{
  color: Color;
  pieceType: AnyPieceType;
}>;

export type Square = Readonly<{
  file: number; // 1-9 (right to left)
  rank: number; // 1-9 (top to bottom)
}>;

export type BoardMove = Readonly<{
  type: "board";
  from: Square;
  to: Square;
  promote: boolean;
}>;

export type DropMove = Readonly<{
  type: "drop";
  pieceType: PieceType;
  to: Square;
}>;

export type Move = BoardMove | DropMove;

export type Hand = Readonly<Record<PieceType, number>>;

export const EMPTY_HAND: Hand = {
  king: 0,
  rook: 0,
  bishop: 0,
  gold: 0,
  silver: 0,
  knight: 0,
  lance: 0,
  pawn: 0,
} as const;

export type Board = ReadonlyArray<ReadonlyArray<Piece | null>>;

export type GameStatus =
  | "playing"
  | "checkmate"
  | "stalemate"
  | "repetition"
  | "perpetualCheck"
  | "impasse"
  | "resigned"
  | "timeout";

export type GameResult = Readonly<{
  status: GameStatus;
  winner: Color | null;
}>;

export type Position = Readonly<{
  board: Board;
  hands: Readonly<Record<Color, Hand>>;
  turn: Color;
  moveCount: number;
}>;

export type MoveWithEval = Readonly<{
  move: Move;
  eval?: number; // centipawn
  isPV?: boolean;
  rank?: number; // 1=best, 2=second, etc.
}>;

export type GameConnection = {
  readonly sendMove: (move: Move) => void;
  readonly onMove: (callback: (move: Move) => void) => void;
  readonly onGameEnd: (callback: (result: GameResult) => void) => void;
  readonly disconnect: () => void;
};
