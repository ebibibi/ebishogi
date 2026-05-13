import type { EngineBestMove, EngineInfo } from "./types";

export function parseInfoLine(line: string): Partial<EngineInfo> | null {
  if (!line.startsWith("info ")) return null;

  const tokens = line.split(" ");
  let depth: number | undefined;
  let score: number | undefined;
  let nodes: number | undefined;
  let nps: number | undefined;
  let time: number | undefined;
  let multipv: number | undefined;
  let pv: readonly string[] | undefined;
  let i = 1;

  while (i < tokens.length) {
    switch (tokens[i]) {
      case "depth":
        depth = parseInt(tokens[++i], 10);
        break;
      case "score": {
        i++;
        if (tokens[i] === "cp") {
          score = parseInt(tokens[++i], 10);
        } else if (tokens[i] === "mate") {
          const mateIn = parseInt(tokens[++i], 10);
          score = mateIn > 0 ? 30000 - mateIn : -30000 - mateIn;
        }
        break;
      }
      case "nodes":
        nodes = parseInt(tokens[++i], 10);
        break;
      case "nps":
        nps = parseInt(tokens[++i], 10);
        break;
      case "time":
        time = parseInt(tokens[++i], 10);
        break;
      case "multipv":
        multipv = parseInt(tokens[++i], 10);
        break;
      case "pv": {
        pv = tokens.slice(i + 1);
        i = tokens.length;
        break;
      }
      default:
        break;
    }
    i++;
  }

  return { depth, score, nodes, nps, time, multipv, pv };
}

export function parseBestMove(line: string): EngineBestMove | null {
  if (!line.startsWith("bestmove ")) return null;

  const tokens = line.split(" ");
  const bestmove = tokens[1];
  if (!bestmove) return null;

  const ponder = tokens[2] === "ponder" ? tokens[3] : undefined;
  return { bestmove, ponder };
}

export function buildPositionCommand(
  sfen: string,
  moves: readonly string[],
): string {
  const base = `position sfen ${sfen}`;
  return moves.length > 0 ? `${base} moves ${moves.join(" ")}` : base;
}

export function buildGoCommand(options: {
  depth?: number;
  time?: number;
  nodes?: number;
  infinite?: boolean;
}): string {
  if (options.infinite) return "go infinite";
  if (options.depth) return `go depth ${options.depth}`;
  if (options.time) return `go movetime ${options.time}`;
  if (options.nodes) return `go nodes ${options.nodes}`;
  return "go depth 10";
}
