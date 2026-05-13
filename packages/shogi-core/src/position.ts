import { BOARD_SIZE, demote, isPromoted } from "./constants";
import type {
  AnyPieceType,
  Board,
  Color,
  Hand,
  Move,
  Piece,
  PieceType,
  Position,
  Square,
} from "./types";
import { EMPTY_HAND } from "./types";

export function createInitialPosition(): Position {
  return parseSfen("lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1");
}

export function getPiece(position: Position, square: Square): Piece | null {
  return position.board[square.rank - 1]?.[9 - square.file] ?? null;
}

export function oppositeColor(color: Color): Color {
  return color === "sente" ? "gote" : "sente";
}

export function applyMove(position: Position, move: Move): Position {
  const newBoard = position.board.map((row) => [...row]);
  const newHands: Record<Color, Hand> = {
    sente: { ...position.hands.sente },
    gote: { ...position.hands.gote },
  };

  if (move.type === "board") {
    const fromRow = move.from.rank - 1;
    const fromCol = 9 - move.from.file;
    const toRow = move.to.rank - 1;
    const toCol = 9 - move.to.file;

    const movingPiece = newBoard[fromRow][fromCol];
    if (!movingPiece) throw new Error("No piece at source square");

    const captured = newBoard[toRow][toCol];
    if (captured) {
      const capturedBase = demote(captured.pieceType) as PieceType;
      newHands[position.turn] = {
        ...newHands[position.turn],
        [capturedBase]: newHands[position.turn][capturedBase] + 1,
      };
    }

    newBoard[fromRow][fromCol] = null;

    const newPieceType = move.promote
      ? getPromotedType(movingPiece.pieceType)
      : movingPiece.pieceType;

    newBoard[toRow][toCol] = {
      color: movingPiece.color,
      pieceType: newPieceType,
    };
  } else {
    const toRow = move.to.rank - 1;
    const toCol = 9 - move.to.file;

    newBoard[toRow][toCol] = {
      color: position.turn,
      pieceType: move.pieceType,
    };

    newHands[position.turn] = {
      ...newHands[position.turn],
      [move.pieceType]: newHands[position.turn][move.pieceType] - 1,
    };
  }

  return {
    board: newBoard.map((row) => [...row]),
    hands: newHands,
    turn: oppositeColor(position.turn),
    moveCount: position.moveCount + 1,
  };
}

function getPromotedType(pieceType: AnyPieceType): AnyPieceType {
  const promotionMap: Partial<Record<AnyPieceType, AnyPieceType>> = {
    rook: "promotedRook",
    bishop: "promotedBishop",
    silver: "promotedSilver",
    knight: "promotedKnight",
    lance: "promotedLance",
    pawn: "promotedPawn",
  };
  return promotionMap[pieceType] ?? pieceType;
}

export function parseSfen(sfen: string): Position {
  const parts = sfen.split(" ");
  if (parts.length < 3) throw new Error(`Invalid SFEN: ${sfen}`);

  const [boardStr, turnStr, handsStr] = parts;
  const moveCount = parts[3] ? parseInt(parts[3], 10) : 1;

  const board = parseSfenBoard(boardStr);
  const turn: Color = turnStr === "b" ? "sente" : "gote";
  const hands = parseSfenHands(handsStr);

  return { board, hands, turn, moveCount };
}

function parseSfenBoard(boardStr: string): Board {
  const rows = boardStr.split("/");
  if (rows.length !== BOARD_SIZE)
    throw new Error(`Invalid board: expected 9 rows, got ${rows.length}`);

  return rows.map((rowStr) => {
    const row: (Piece | null)[] = [];
    let promoted = false;

    for (const char of rowStr) {
      if (char === "+") {
        promoted = true;
        continue;
      }

      const digit = parseInt(char, 10);
      if (!isNaN(digit)) {
        for (let j = 0; j < digit; j++) row.push(null);
        continue;
      }

      const isUpper = char === char.toUpperCase();
      const color: Color = isUpper ? "sente" : "gote";
      const pieceChar = (promoted ? "+" : "") + char.toUpperCase();
      const pieceType = sfenCharToPieceType(pieceChar);

      if (pieceType) {
        row.push({ color, pieceType });
      }
      promoted = false;
    }

    return row;
  });
}

function sfenCharToPieceType(char: string): AnyPieceType | null {
  const map: Record<string, AnyPieceType> = {
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
  return map[char] ?? null;
}

function parseSfenHands(handsStr: string): Record<Color, Hand> {
  const hands: Record<Color, Hand> = {
    sente: { ...EMPTY_HAND },
    gote: { ...EMPTY_HAND },
  };

  if (handsStr === "-") return hands;

  let count = 0;
  for (const char of handsStr) {
    const digit = parseInt(char, 10);
    if (!isNaN(digit)) {
      count = count * 10 + digit;
      continue;
    }

    const n = count || 1;
    const isUpper = char === char.toUpperCase();
    const color: Color = isUpper ? "sente" : "gote";
    const pieceType = sfenCharToPieceType(char.toUpperCase());

    if (pieceType && !isPromoted(pieceType)) {
      hands[color] = {
        ...hands[color],
        [pieceType]: n,
      };
    }
    count = 0;
  }

  return hands;
}

export function toSfen(position: Position): string {
  const boardStr = position.board
    .map((row) => {
      let rowStr = "";
      let emptyCount = 0;

      for (const cell of row) {
        if (!cell) {
          emptyCount++;
          continue;
        }
        if (emptyCount > 0) {
          rowStr += emptyCount;
          emptyCount = 0;
        }
        const sfenChar = pieceTypeToSfenChar(cell.pieceType);
        rowStr += cell.color === "sente" ? sfenChar : sfenChar.toLowerCase();
      }

      if (emptyCount > 0) rowStr += emptyCount;
      return rowStr;
    })
    .join("/");

  const turnStr = position.turn === "sente" ? "b" : "w";
  const handsStr = handsToSfen(position.hands);

  return `${boardStr} ${turnStr} ${handsStr} ${position.moveCount}`;
}

function pieceTypeToSfenChar(pieceType: AnyPieceType): string {
  const map: Record<AnyPieceType, string> = {
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
  return map[pieceType];
}

function handsToSfen(hands: Readonly<Record<Color, Hand>>): string {
  const order: PieceType[] = [
    "rook",
    "bishop",
    "gold",
    "silver",
    "knight",
    "lance",
    "pawn",
  ];

  let result = "";

  for (const color of ["sente", "gote"] as const) {
    for (const pt of order) {
      const count = hands[color][pt];
      if (count <= 0) continue;
      if (count > 1) result += count;
      const ch = pieceTypeToSfenChar(pt);
      result += color === "sente" ? ch : ch.toLowerCase();
    }
  }

  return result || "-";
}

export function squareToUSI(square: Square): string {
  return `${square.file}${String.fromCharCode(96 + square.rank)}`;
}

export function moveToUSI(move: Move): string {
  if (move.type === "drop") {
    const pieceChar = pieceTypeToSfenChar(move.pieceType);
    return `${pieceChar}*${squareToUSI(move.to)}`;
  }
  const from = squareToUSI(move.from);
  const to = squareToUSI(move.to);
  return `${from}${to}${move.promote ? "+" : ""}`;
}

export function parseUSIMove(usi: string): Move | null {
  if (usi.length < 4) return null;

  if (usi[1] === "*") {
    const pieceType = sfenCharToPieceType(usi[0].toUpperCase());
    if (!pieceType || isPromoted(pieceType)) return null;
    const to = parseUSISquare(usi.slice(2, 4));
    if (!to) return null;
    return { type: "drop", pieceType: pieceType as PieceType, to };
  }

  const from = parseUSISquare(usi.slice(0, 2));
  const to = parseUSISquare(usi.slice(2, 4));
  if (!from || !to) return null;
  const promote = usi[4] === "+";

  return { type: "board", from, to, promote };
}

function parseUSISquare(s: string): Square | null {
  const file = parseInt(s[0], 10);
  const rank = s.charCodeAt(1) - 96;
  if (file < 1 || file > 9 || rank < 1 || rank > 9) return null;
  return { file, rank };
}
