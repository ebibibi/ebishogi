export type {
  Color,
  PieceType,
  PromotedPieceType,
  AnyPieceType,
  Piece,
  Square,
  BoardMove,
  DropMove,
  Move,
  Hand,
  Board,
  Position,
  GameStatus,
  GameResult,
  GameConnection,
  MoveWithEval,
} from "./types";

export { COLORS, PIECE_TYPES, PROMOTED_PIECE_TYPES, EMPTY_HAND } from "./types";

export {
  BOARD_SIZE,
  PROMOTION_MAP,
  DEMOTION_MAP,
  PIECE_KANJI,
  SFEN_PIECE_MAP,
  PIECE_TO_SFEN,
  promote,
  demote,
  isPromoted,
} from "./constants";

export {
  createInitialPosition,
  getPiece,
  oppositeColor,
  applyMove,
  parseSfen,
  toSfen,
  squareToUSI,
  moveToUSI,
  parseUSIMove,
} from "./position";

export { createLocalConnection } from "./game-connection";
