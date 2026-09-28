import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  makeKif,
  makeUsiPosition,
  parseKifu,
  replayRecord,
  recordFromStates,
  type GameRecord,
} from "./kifu";
import { INITIAL_SFEN } from "./shogi-game";

// 棋譜の変換は純粋関数なので、ブラウザを使わずに往復で確かめる。

// 角交換（成り・同・打ちを含む）
const BISHOP_TRADE: GameRecord = {
  initialSfen: INITIAL_SFEN,
  moves: ["7g7f", "3c3d", "8h2b+", "3a2b", "B*4e"],
};

function mustParse(text: string): GameRecord {
  const r = parseKifu(text);
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

describe("棋譜の変換", () => {
  test("KIFに書き出すと成り・同・打ちが表記される", () => {
    const kif = makeKif(BISHOP_TRADE, { sente: "あなた", gote: "CPU" });
    assert.ok(kif.includes("手合割：平手"));
    assert.ok(kif.includes("先手：あなた"));
    assert.ok(kif.includes("   1 ７六歩(77)"));
    assert.ok(kif.includes("   3 ２二角成(88)"));
    assert.ok(kif.includes("   4 同　銀(31)"));
    assert.ok(kif.includes("   5 ４五角打"));
  });

  test("KIFは書き出して読み直すと同じ棋譜に戻る", () => {
    assert.deepEqual(mustParse(makeKif(BISHOP_TRADE)), BISHOP_TRADE);
  });

  test("平手以外の開始局面もKIFで往復できる", () => {
    const record: GameRecord = {
      initialSfen: "4k4/9/9/9/9/9/9/9/4K4 b 2G 1",
      moves: ["G*5c", "5a4a"],
    };
    const kif = makeKif(record);
    assert.ok(kif.includes("後手の持駒"));
    assert.deepEqual(mustParse(kif), record);
  });

  test("詰みで終わった対局には「詰み」行が付く", () => {
    // 先手の頭金で詰む最短の局面
    const record: GameRecord = {
      initialSfen: "4k4/9/4P4/9/9/9/9/9/4K4 b G 1",
      moves: ["G*5b"],
    };
    assert.ok(makeKif(record).includes("   2 詰み"));
  });

  test("USIのposition文字列は平手ならstartposで往復できる", () => {
    const usi = makeUsiPosition(BISHOP_TRADE);
    assert.equal(usi, "startpos moves 7g7f 3c3d 8h2b+ 3a2b B*4e");
    assert.deepEqual(mustParse(`position ${usi}`), BISHOP_TRADE);
  });

  test("USIは開始局面がsfenでも往復できる", () => {
    const record: GameRecord = {
      initialSfen: "4k4/9/4P4/9/9/9/9/9/4K4 b G 1",
      moves: ["G*5b"],
    };
    const usi = makeUsiPosition(record);
    assert.equal(usi.startsWith("sfen "), true);
    assert.deepEqual(mustParse(usi), record);
  });

  test("裸のSFENや指し手だけの列も読める", () => {
    assert.deepEqual(mustParse(INITIAL_SFEN), {
      initialSfen: INITIAL_SFEN,
      moves: [],
    });
    assert.deepEqual(mustParse("7g7f 3c3d").moves, ["7g7f", "3c3d"]);
  });

  test("他ソフトのKIF（消費時間・表記ゆれ・終局語・変化）を読める", () => {
    const kif = [
      "開始日時：2026/09/28 10:00:00",
      "手合割：平手　　",
      "先手：A",
      "後手：B",
      "手数----指手---------消費時間--",
      "   1 ７六歩(77)   ( 0:01/00:00:01)",
      "*コメントは無視する",
      "   2 ３四歩(33)   ( 0:02/00:00:02)",
      "   3 ２二角成(88)   ( 0:01/00:00:02)",
      "   4 同　銀(31)   ( 0:01/00:00:03)",
      "   5 4五角打   ( 0:01/00:00:03)",
      "   6 投了   ( 0:01/00:00:04)",
      "",
      "変化：3手",
      "   3 ６六歩(67)",
    ].join("\r\n");
    assert.deepEqual(mustParse(kif), BISHOP_TRADE);
  });

  test("竜・王などの別表記も読める", () => {
    const record = mustParse(
      [
        "後手の持駒：なし",
        "  ９ ８ ７ ６ ５ ４ ３ ２ １",
        "+---------------------------+",
        "| ・ ・ ・ ・v王 ・ ・ ・ ・|一",
        "| ・ ・ ・ ・ ・ ・ ・ ・ ・|二",
        "| ・ ・ ・ ・ ・ ・ ・ ・ ・|三",
        "| ・ ・ ・ ・ ・ ・ ・ ・ ・|四",
        "| ・ ・ ・ ・ ・ ・ ・ ・ ・|五",
        "| ・ ・ ・ ・ ・ ・ ・ ・ ・|六",
        "| ・ ・ ・ ・ ・ ・ ・ ・ ・|七",
        "| ・ ・ ・ ・ ・ ・ ・ ・ 竜|八",
        "| ・ ・ ・ ・ 王 ・ ・ ・ ・|九",
        "+---------------------------+",
        "先手の持駒：なし",
        "手数----指手---------消費時間--",
        "   1 １二竜(18)",
      ].join("\n"),
    );
    assert.deepEqual(record.moves, ["1h1b"]);
  });

  test("不正な手は何手目かを示して失敗する", () => {
    const r = parseKifu("startpos moves 7g7f 7g7f");
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.error.includes("2手目"));
  });

  test("USIでない文字列は失敗する", () => {
    assert.equal(parseKifu("hello world").ok, false);
    assert.equal(parseKifu("   ").ok, false);
  });

  test("局面列から棋譜を作り直せる", () => {
    const replay = replayRecord(BISHOP_TRADE);
    if (!replay.ok) throw new Error(replay.error);
    assert.deepEqual(recordFromStates(replay.value), BISHOP_TRADE);
  });
});
