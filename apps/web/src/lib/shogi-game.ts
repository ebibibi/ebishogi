import { Shogi } from "shogiops/variant/shogi";
import { parseSfen, makeSfen } from "shogiops/sfen";
import { parseSquareName, makeSquareName, squareFile, squareRank, parseCoordinates } from "shogiops/util";
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

export function canPromote(pos: Shogi, from: Square, to: Square): boolean {
  const piece = pos.board.get(from);
  if (!piece) return false;
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

export type SimpleAILevel = "random" | "basic";

export function getAIMove(state: GameState, level: SimpleAILevel): MoveOrDrop | null {
  if (state.isEnd) return null;

  const allMoves = collectAllLegalMoves(state);
  if (allMoves.length === 0) return null;

  if (level === "random") {
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }

  return pickBasicAIMove(state, allMoves);
}

function collectAllLegalMoves(state: GameState): MoveOrDrop[] {
  const moves: MoveOrDrop[] = [];
  const pos = state.position;

  const moveDests = pos.allMoveDests();
  for (const [from, dests] of moveDests) {
    for (const to of dests) {
      const piece = pos.board.get(from);
      if (piece && canPromote(pos, from, to)) {
        if (mustPromote(pos, from, to)) {
          moves.push({ from, to, promotion: true });
        } else {
          moves.push({ from, to, promotion: true });
          moves.push({ from, to, promotion: false });
        }
      } else {
        moves.push({ from, to });
      }
    }
  }

  const dropDests = pos.allDropDests();
  for (const [pieceName, dests] of dropDests) {
    const role = pieceName.split(" ")[1] as Role;
    for (const to of dests) {
      moves.push({ role, to });
    }
  }

  return moves;
}

const PIECE_VALUES: Record<string, number> = {
  pawn: 100, lance: 300, knight: 350, silver: 450,
  gold: 500, bishop: 700, rook: 800,
  tokin: 500, promotedlance: 500, promotedknight: 500, promotedsilver: 500,
  horse: 1000, dragon: 1100, king: 10000,
};

function pickBasicAIMove(state: GameState, allMoves: MoveOrDrop[]): MoveOrDrop {
  let bestMove = allMoves[0];
  let bestScore = -Infinity;

  for (const move of allMoves) {
    let score = Math.random() * 50;

    if ("from" in move) {
      const captured = state.position.board.get(move.to);
      if (captured) {
        score += (PIECE_VALUES[captured.role] ?? 0) * 2;
      }
      if (move.promotion) score += 200;
    } else {
      score += 100;
    }

    const testPos = state.position.clone();
    testPos.play(move);
    if (testPos.isCheck()) score += 300;
    const opponentOutcome = testPos.outcome();
    if (opponentOutcome?.winner === state.turn) score += 50000;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
