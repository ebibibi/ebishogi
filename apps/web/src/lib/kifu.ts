import { makeSfen } from "shogiops/sfen";
import { makeUsi, parseUsi } from "shogiops/util";
import {
  makeKifHeader,
  makeKifMoveOrDrop,
  normalizedKifLines,
  parseKifHeader,
  parseKifMoveOrDrop,
} from "shogiops/notation/kif";
import type { MoveOrDrop, Square } from "shogiops/types";
import {
  applyMoveToGame,
  createGame,
  INITIAL_SFEN,
  type GameState,
} from "@/lib/shogi-game";

/**
 * 棋譜の内部表現。開始局面（SFEN）と USI 形式の指し手列だけを持つ。
 * KIF も USI の position 文字列も、この形を経由して相互に変換する。
 */
export type GameRecord = {
  readonly initialSfen: string;
  readonly moves: readonly string[];
};

export type KifuResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

export type KifMeta = {
  readonly startedAt?: Date;
  readonly sente?: string;
  readonly gote?: string;
};

const ok = <T>(value: T): KifuResult<T> => ({ ok: true, value });
const fail = <T>(error: string): KifuResult<T> => ({ ok: false, error });

// ── 局面列 ⇔ 棋譜 ─────────────────────────────────────

/** 対局の局面列（先頭が開始局面）から棋譜を作る。 */
export function recordFromStates(states: readonly GameState[]): GameRecord {
  const moves = states
    .slice(1)
    .map((s) => s.lastMove)
    .filter((m): m is MoveOrDrop => m !== null)
    .map(makeUsi);
  return { initialSfen: states[0]?.sfen ?? INITIAL_SFEN, moves };
}

/** 棋譜を開始局面から再生し、局面列を返す。不正な手があればその手数で失敗する。 */
export function replayRecord(record: GameRecord): KifuResult<GameState[]> {
  let first: GameState;
  try {
    first = createGame(record.initialSfen);
  } catch {
    return fail("開始局面を読み取れませんでした");
  }
  const states: GameState[] = [first];
  for (const [i, usi] of record.moves.entries()) {
    const move = parseUsi(usi);
    const prev = states[states.length - 1];
    const next = move ? applyMoveToGame(prev, move) : null;
    if (!next) return fail(`${i + 1}手目（${usi}）を指せません`);
    states.push(next);
  }
  return ok(states);
}

// ── USI ───────────────────────────────────────────────

/** USI の position コマンド引数（`startpos moves ...` / `sfen ... moves ...`）。 */
export function makeUsiPosition(record: GameRecord): string {
  const base =
    record.initialSfen === INITIAL_SFEN
      ? "startpos"
      : `sfen ${record.initialSfen}`;
  return record.moves.length > 0
    ? `${base} moves ${record.moves.join(" ")}`
    : base;
}

const SFEN_FIELDS = 4;

/**
 * USI/SFEN 文字列を読む。受け付ける形:
 * `position startpos moves ...` / `startpos moves ...` / `sfen <局面> moves ...` /
 * 裸の SFEN（後ろに `moves ...` 可）/ 指し手だけの列（平手から）。
 */
export function parseUsiPosition(text: string): KifuResult<GameRecord> {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens[0] === "position") tokens.shift();
  if (tokens.length === 0) return fail("棋譜が空です");

  let initialSfen = INITIAL_SFEN;
  let rest = tokens;
  if (tokens[0] === "startpos") {
    rest = tokens.slice(1);
  } else if (tokens[0] === "sfen" || tokens[0].includes("/")) {
    const start = tokens[0] === "sfen" ? 1 : 0;
    initialSfen = tokens.slice(start, start + SFEN_FIELDS).join(" ");
    rest = tokens.slice(start + SFEN_FIELDS);
  }
  if (rest[0] === "moves") rest = rest.slice(1);

  const bad = rest.find((usi) => !parseUsi(usi));
  if (bad) return fail(`「${bad}」はUSI形式の指し手ではありません`);
  return validated({ initialSfen, moves: rest });
}

// ── KIF ───────────────────────────────────────────────

const KIF_END_WORDS = [
  "投了", "中断", "詰み", "千日手", "持将棋", "切れ負け", "反則勝ち",
  "反則負け", "入玉勝ち", "不詰", "不戦勝", "不戦敗",
];

/** 棋譜を KIF 形式の文字列にする。 */
export function makeKif(record: GameRecord, meta: KifMeta = {}): string {
  const replay = replayRecord(record);
  if (!replay.ok) throw new Error(replay.error);
  const states = replay.value;

  const header = [
    "# ---- えび将棋 棋譜ファイル ----",
    ...(meta.startedAt ? [`開始日時：${formatKifDate(meta.startedAt)}`] : []),
    makeKifHeader(states[0].position),
    `先手：${meta.sente ?? "先手"}`,
    `後手：${meta.gote ?? "後手"}`,
    "手数----指手---------消費時間--",
  ];

  const moveLines = states.slice(1).map((s, i) => {
    const prev = states[i];
    const kif = makeKifMoveOrDrop(prev.position, s.lastMove as MoveOrDrop);
    return kifLine(i + 1, kif ?? "");
  });

  const last = states[states.length - 1];
  const endLine =
    last.position.outcome()?.result === "checkmate"
      ? [kifLine(states.length, "詰み")]
      : [];

  return [...header, ...moveLines, ...endLine, ""].join("\n");
}

function kifLine(n: number, text: string): string {
  return `${String(n).padStart(4)} ${text}`;
}

function formatKifDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

/** KIF 形式の文字列を読む。分岐（変化）は本譜だけを採る。 */
export function parseKif(text: string): KifuResult<GameRecord> {
  const header = parseKifHeader(text);
  if (header.isErr) return fail("KIFの開始局面を読み取れませんでした");
  const initialSfen = makeSfen(header.value);

  const moves: string[] = [];
  let lastDest: Square | undefined;
  for (const body of kifMoveBodies(text)) {
    if (KIF_END_WORDS.some((w) => body.startsWith(w))) break;
    const md = parseKifMove(body, lastDest);
    if (!md) return fail(`${moves.length + 1}手目「${body}」を読み取れませんでした`);
    moves.push(makeUsi(md));
    lastDest = md.to;
  }
  return validated({ initialSfen, moves });
}

const MOVE_LINE = /^(\d+)\s+(\S.*)$/;

/** 指し手行から「手数」を除いた本体を、本譜の範囲だけ順に返す。 */
function kifMoveBodies(text: string): string[] {
  const bodies: string[] = [];
  for (const line of normalizedKifLines(text)) {
    if (line.startsWith("変化")) break;
    const m = line.match(MOVE_LINE);
    if (m) bodies.push(m[2]);
  }
  return bodies;
}

/** ソフトごとの駒の表記ゆれを shogiops が読める表記へ寄せる。 */
const PIECE_ALIASES: readonly [RegExp, string][] = [
  [/竜/g, "龍"],
  [/王/g, "玉"],
  [/全/g, "成銀"],
  [/圭/g, "成桂"],
  [/杏/g, "成香"],
];

const HALF_TO_FULL_DIGIT = "０１２３４５６７８９";

function normalizeKifMove(body: string): string {
  const aliased = PIECE_ALIASES.reduce(
    (s, [re, to]) => s.replace(re, to),
    body,
  );
  // 移動先の筋を半角数字で書くソフトがあるため全角に寄せる（移動元の (77) は触らない）
  return aliased.replace(/^([1-9])/, (d) => HALF_TO_FULL_DIGIT[Number(d)]);
}

function parseKifMove(
  body: string,
  lastDest: Square | undefined,
): MoveOrDrop | undefined {
  const normalized = normalizeKifMove(body);
  const md = parseKifMoveOrDrop(normalized, lastDest);
  if (md) return md;
  // 「打」を省略した打ち（移動元が無い）を救う
  return normalized.includes("(")
    ? undefined
    : parseKifMoveOrDrop(normalized.replace(/^(\S+?)(\s|$)/, "$1打$2"), lastDest);
}

// ── 入口 ──────────────────────────────────────────────

/** 貼り付け・ファイルの中身を KIF か USI/SFEN か判定して読む。 */
export function parseKifu(text: string): KifuResult<GameRecord> {
  if (text.trim().length === 0) return fail("棋譜が空です");
  return looksLikeKif(text) ? parseKif(text) : parseUsiPosition(text);
}

function looksLikeKif(text: string): boolean {
  return /手合割|手数|先手|後手|[一二三四五六七八九][歩香桂銀金角飛玉王と馬龍竜]/.test(
    text,
  );
}

/** 局面と指し手が実際に再生できるかを確かめてから返す。 */
function validated(record: GameRecord): KifuResult<GameRecord> {
  const replay = replayRecord(record);
  return replay.ok ? ok(record) : fail(replay.error);
}

/** KIF ファイルのバイト列を文字列にする。UTF-8 で読めなければ Shift_JIS（.kif の慣例）。 */
export function decodeKifuBytes(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("shift_jis").decode(bytes);
  }
}
