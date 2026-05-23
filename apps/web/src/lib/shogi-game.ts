import { Shogi } from "shogiops/variant/shogi";
import { parseSfen, makeSfen } from "shogiops/sfen";
import { squareFile, squareRank, parseCoordinates, parseUsi } from "shogiops/util";
import type { MoveOrDrop, Square, Color, Role, Piece } from "shogiops/types";
import type { SquareSet } from "shogiops/square-set";

export type GameState = {
  position: Shogi;
  sfen: string;
  turn: Color;
  moveCount: number;
  isCheck: boolean;
  isEnd: boolean;
  outcome: { winner: Color | undefined } | null;
  lastMove: MoveOrDrop | null;
};

export function createGame(): GameState {
  const result = parseSfen("standard", "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1");
  if (result.isErr) throw new Error("Failed to parse initial SFEN");
  const pos = result.value as Shogi;
  return stateFromPosition(pos, null);
}

function stateFromPosition(pos: Shogi, lastMove: MoveOrDrop | null): GameState {
  const outcome = pos.outcome();
  return {
    position: pos,
    sfen: makeSfen(pos),
    turn: pos.turn,
    moveCount: pos.moveNumber,
    isCheck: pos.isCheck(),
    isEnd: pos.isEnd(),
    outcome: outcome ? { winner: outcome.winner } : null,
    lastMove,
  };
}

export function applyMoveToGame(state: GameState, move: MoveOrDrop): GameState | null {
  if (!state.position.isLegal(move)) return null;
  const newPos = state.position.clone();
  newPos.play(move);
  return stateFromPosition(newPos as Shogi, move);
}

export function getLegalMoves(state: GameState, square: Square): Square[] {
  const dests = state.position.moveDests(square);
  return squareSetToArray(dests);
}

export function getLegalDrops(state: GameState, role: Role): Square[] {
  const piece: Piece = { role, color: state.position.turn };
  const dests = state.position.dropDests(piece);
  return squareSetToArray(dests);
}

export function getAllLegalMoves(state: GameState): Map<Square, Square[]> {
  const result = new Map<Square, Square[]>();
  const moveDests = state.position.allMoveDests();
  for (const [sq, dests] of moveDests) {
    const arr = squareSetToArray(dests);
    if (arr.length > 0) result.set(sq, arr);
  }
  return result;
}

function squareSetToArray(ss: SquareSet): Square[] {
  const result: Square[] = [];
  for (const sq of ss) {
    result.push(sq);
  }
  return result;
}

export function squareToCoords(sq: Square): { file: number; rank: number } {
  return { file: squareFile(sq) + 1, rank: squareRank(sq) + 1 };
}

export function coordsToSquare(file: number, rank: number): Square {
  return parseCoordinates(file - 1, rank - 1) as Square;
}

const PROMOTABLE_ROLES: ReadonlySet<Role> = new Set<Role>([
  "pawn", "lance", "knight", "silver", "bishop", "rook",
]);

export function canPromote(pos: Shogi, from: Square, to: Square): boolean {
  const piece = pos.board.get(from);
  if (!piece) return false;
  if (!PROMOTABLE_ROLES.has(piece.role)) return false;
  const fromRank = squareRank(from);
  const toRank = squareRank(to);
  if (piece.color === "sente") {
    return fromRank <= 2 || toRank <= 2;
  }
  return fromRank >= 6 || toRank >= 6;
}

export function mustPromote(pos: Shogi, from: Square, to: Square): boolean {
  const piece = pos.board.get(from);
  if (!piece) return false;
  const toRank = squareRank(to);
  if (piece.color === "sente") {
    if (piece.role === "pawn" || piece.role === "lance") return toRank === 0;
    if (piece.role === "knight") return toRank <= 1;
  } else {
    if (piece.role === "pawn" || piece.role === "lance") return toRank === 8;
    if (piece.role === "knight") return toRank >= 7;
  }
  return false;
}

export function getHandPieces(pos: Shogi, color: Color): Map<Role, number> {
  const result = new Map<Role, number>();
  const hand = pos.hands[color];
  if (!hand) return result;
  for (const role of ["rook", "bishop", "gold", "silver", "knight", "lance", "pawn"] as Role[]) {
    const count = hand.get(role) ?? 0;
    if (count > 0) result.set(role, count);
  }
  return result;
}

export function usiToMove(usi: string): MoveOrDrop | undefined {
  return parseUsi(usi);
}

export type RepetitionResult =
  | { readonly type: "none" }
  | { readonly type: "repetition" }
  | { readonly type: "perpetualCheck"; readonly loser: Color };

function positionKey(sfen: string): string {
  return sfen.split(" ").slice(0, 3).join(" ");
}

export function detectRepetition(
  entries: ReadonlyArray<{ readonly sfen: string; readonly isCheck: boolean }>,
): RepetitionResult {
  if (entries.length < 2) return { type: "none" };

  const latestKey = positionKey(entries[entries.length - 1].sfen);

  const indices: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    if (positionKey(entries[i].sfen) === latestKey) {
      indices.push(i);
    }
  }

  if (indices.length < 4) return { type: "none" };

  const firstIdx = indices[0];
  const lastIdx = indices[indices.length - 1];

  let senteAlwaysChecks = true;
  let goteAlwaysChecks = true;
  let senteMoveCount = 0;
  let goteMoveCount = 0;

  for (let i = firstIdx + 1; i <= lastIdx; i++) {
    const turnInSfen = entries[i].sfen.split(" ")[1];
    const mover: Color = turnInSfen === "b" ? "gote" : "sente";
    const resultedInCheck = entries[i].isCheck;

    if (mover === "sente") {
      senteMoveCount++;
      if (!resultedInCheck) senteAlwaysChecks = false;
    } else {
      goteMoveCount++;
      if (!resultedInCheck) goteAlwaysChecks = false;
    }
  }

  if (
    senteMoveCount > 0 &&
    senteAlwaysChecks &&
    !(goteMoveCount > 0 && goteAlwaysChecks)
  ) {
    return { type: "perpetualCheck", loser: "sente" };
  }
  if (
    goteMoveCount > 0 &&
    goteAlwaysChecks &&
    !(senteMoveCount > 0 && senteAlwaysChecks)
  ) {
    return { type: "perpetualCheck", loser: "gote" };
  }

  return { type: "repetition" };
}
