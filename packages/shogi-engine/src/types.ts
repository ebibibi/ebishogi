export type EngineState = "idle" | "loading" | "ready" | "searching" | "error";

export type EngineInfo = Readonly<{
  depth: number;
  score: number; // centipawn (from current player's perspective)
  pv: readonly string[]; // principal variation in USI notation
  nodes?: number;
  nps?: number;
  time?: number;
  multipv?: number;
}>;

export type EngineBestMove = Readonly<{
  bestmove: string; // USI notation
  ponder?: string;
}>;

export type EngineOptions = Readonly<{
  threads?: number;
  hashMB?: number;
  multiPV?: number;
  skillLevel?: number; // 0-20
}>;

export type SearchOptions = Readonly<{
  depth?: number;
  time?: number; // milliseconds
  nodes?: number;
  infinite?: boolean;
}>;

export type EngineEvent =
  | { type: "state"; state: EngineState }
  | { type: "info"; info: EngineInfo }
  | { type: "bestmove"; result: EngineBestMove };
