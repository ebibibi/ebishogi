import type { GameState } from "@/lib/shogi-game";
import { recordFromStates, replayRecord, type GameRecord } from "@/lib/kifu";

/**
 * CPU対局の直前の1局を localStorage に置き、リロードしても続きから指せるようにする。
 * 保存するのは開始局面と USI の指し手列だけで、局面は読み込み時に再生して作り直す。
 */
export const SAVED_GAME_KEY = "ebishogi:lastGame";

function isGameRecord(v: unknown): v is GameRecord {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.initialSfen === "string" &&
    Array.isArray(r.moves) &&
    r.moves.every((m) => typeof m === "string")
  );
}

/** 保存済みの対局を局面列で返す。無い・壊れている・再生できないときは null。 */
export function loadSavedGame(): GameState[] | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVED_GAME_KEY);
  } catch {
    return null; // localStorage が使えない環境
  }
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isGameRecord(parsed)) return null;
    const replay = replayRecord(parsed);
    return replay.ok ? replay.value : null;
  } catch {
    return null; // 壊れた JSON は保存なし扱い
  }
}

export function saveGame(states: readonly GameState[]): void {
  try {
    localStorage.setItem(
      SAVED_GAME_KEY,
      JSON.stringify(recordFromStates(states)),
    );
  } catch {
    /* 保存できなくても対局は続けられる */
  }
}
