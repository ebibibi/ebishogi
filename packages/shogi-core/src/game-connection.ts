import type { GameConnection, GameResult, Move } from "./types";

export function createLocalConnection(): GameConnection {
  const moveCallbacks: Array<(move: Move) => void> = [];
  const endCallbacks: Array<(result: GameResult) => void> = [];

  return {
    sendMove(move: Move) {
      for (const cb of moveCallbacks) cb(move);
    },
    onMove(callback: (move: Move) => void) {
      moveCallbacks.push(callback);
    },
    onGameEnd(callback: (result: GameResult) => void) {
      endCallbacks.push(callback);
    },
    disconnect() {
      moveCallbacks.length = 0;
      endCallbacks.length = 0;
    },
  };
}
