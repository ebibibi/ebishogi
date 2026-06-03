"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { MoveOrDrop } from "shogiops/types";
import { TsumeBoard } from "./TsumeBoard";
import {
  problemsByMate,
  MATE_LEVELS,
  type TsumeProblem,
} from "@/lib/tsume/problems";
import {
  startProblem,
  playAttackerMove,
  remainingMate,
  type TsumeState,
} from "@/lib/tsume/tsume-game";
import { buildHints } from "@/lib/tsume/hint";
import { AdBanner } from "@/components/AdBanner";
import { AD_SLOTS } from "@/lib/ad-slots";

// 解答回数（id → 解いた回数）。反復練習の可視化に使う。
const COUNTS_KEY = "ebishogi-tsume-counts-v1";
const SET_SIZES = [10, 50, 100] as const;
const YANEURAOU_URL =
  "https://yaneuraou.yaneu.com/2020/12/25/christmas-present/";

type Message = { text: string; kind: "correct" | "wrong" | "solved" } | null;

export function TsumeView({ onBack }: { onBack: () => void }) {
  const [mate, setMate] = useState(3);
  const [setSize, setSetSize] = useState<number>(10);
  const [setIndex, setSetIndex] = useState<number | null>(null); // null=セット選択画面
  const [posInSet, setPosInSet] = useState(0);
  const [history, setHistory] = useState<TsumeState[]>([]);
  const [message, setMessage] = useState<Message>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COUNTS_KEY);
      if (raw) setCounts(JSON.parse(raw));
    } catch {
      /* localStorage 不可でも続行 */
    }
  }, []);

  const recordSolve = useCallback((id: string) => {
    setCounts((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      try {
        localStorage.setItem(COUNTS_KEY, JSON.stringify(next));
      } catch {
        /* 保存失敗は無視 */
      }
      return next;
    });
  }, []);

  const mateProblems = useMemo(() => problemsByMate(mate), [mate]);
  const setTotal = Math.max(1, Math.ceil(mateProblems.length / setSize));
  const currentSet = useMemo(
    () =>
      setIndex === null
        ? []
        : mateProblems.slice(setIndex * setSize, setIndex * setSize + setSize),
    [mateProblems, setIndex, setSize],
  );
  const problem = currentSet[posInSet] ?? null;

  // 問題が変わったら盤面を初期化する
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (problem) {
      setHistory([startProblem(problem)]);
      setMessage(null);
      setHintLevel(0);
    }
  }, [problem?.id]);

  const state = history[history.length - 1] ?? null;

  const onMove = useCallback(
    (move: MoveOrDrop) => {
      if (!state) return;
      const outcome = playAttackerMove(state, move);
      if (outcome.type === "wrong") {
        setMessage({ text: outcome.message, kind: "wrong" });
        return;
      }
      setHistory((h) => [...h, outcome.state]);
      setHintLevel(0);
      if (outcome.type === "solved") {
        setMessage({ text: "正解！詰みました 🎉", kind: "solved" });
        recordSolve(outcome.state.problem.id);
      } else {
        setMessage({ text: "正解！ いい手です", kind: "correct" });
      }
    },
    [state, recordSolve],
  );

  const openSet = useCallback((idx: number) => {
    setSetIndex(idx);
    setPosInSet(0);
  }, []);

  // ── セット選択画面 ─────────────────────────────────────
  if (setIndex === null) {
    const solvedInMate = mateProblems.filter(
      (p) => (counts[p.id] ?? 0) > 0,
    ).length;
    const totalReps = mateProblems.reduce(
      (s, p) => s + (counts[p.id] ?? 0),
      0,
    );

    return (
      <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center p-6">
        <div className="max-w-md w-full flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">実践詰将棋</h1>
            <button
              onClick={onBack}
              className="text-sm text-zinc-400 hover:text-white"
              type="button"
            >
              トップへ
            </button>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed">
            先手（あなた）が攻め方。連続王手で相手玉を詰ませましょう。実戦から生まれた
            詰将棋なので<strong>駒余りもあり</strong>ます。同じセットを繰り返し解いて
            棋力アップ！解いた回数は自動で記録されます。
          </p>

          {/* 手数タブ */}
          <div className="flex gap-2">
            {MATE_LEVELS.map((m) => (
              <button
                key={m}
                onClick={() => setMate(m)}
                className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                  mate === m
                    ? "bg-amber-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
                type="button"
              >
                {m}手詰め
              </button>
            ))}
          </div>

          {/* セットサイズ */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">1セット</span>
            {SET_SIZES.map((sz) => (
              <button
                key={sz}
                onClick={() => setSetSize(sz)}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-colors ${
                  setSize === sz
                    ? "bg-sky-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
                type="button"
              >
                {sz}問
              </button>
            ))}
          </div>

          <p className="text-xs text-zinc-500">
            {mate}手詰め 全{mateProblems.length}問 ・ {solvedInMate}問 着手済み ・
            のべ{totalReps}回 解答
          </p>

          {/* セット一覧 */}
          <div className="grid grid-cols-3 gap-2 max-h-[46vh] overflow-y-auto pr-1">
            {Array.from({ length: setTotal }, (_, i) => {
              const set = mateProblems.slice(
                i * setSize,
                i * setSize + setSize,
              );
              const done = set.filter((p) => (counts[p.id] ?? 0) > 0).length;
              const complete = done === set.length && set.length > 0;
              const from = i * setSize + 1;
              const to = i * setSize + set.length;
              return (
                <button
                  key={i}
                  onClick={() => openSet(i)}
                  className={`rounded-xl p-2 flex flex-col items-center gap-0.5 font-bold transition-colors ${
                    complete
                      ? "bg-emerald-700/80 hover:bg-emerald-600 text-white"
                      : done > 0
                        ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
                  type="button"
                >
                  <span className="text-sm">
                    {from}–{to}
                  </span>
                  <span className="text-[11px] font-normal text-zinc-300">
                    {done}/{set.length}
                    {complete && " ✓"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* クレジット */}
          <p className="text-xs text-zinc-500 text-center leading-relaxed border-t border-zinc-800 pt-3">
            問題は{" "}
            <a
              href={YANEURAOU_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 underline"
            >
              やねうらお氏が公開した詰将棋500万問
            </a>{" "}
            （パブリックドメイン）より。
            <br />
            素晴らしいデータの公開に感謝します 🙏
          </p>

          <AdBanner slot={AD_SLOTS.TSUME_FOOTER} className="w-full mt-2" />
        </div>
      </div>
    );
  }

  // 準備中（problem 初期化待ちの一瞬）
  if (!problem || !state) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <span className="text-zinc-500">読み込み中…</span>
      </div>
    );
  }

  // ── 出題・プレイ画面 ───────────────────────────────────
  const hints = buildHints(state);
  const remaining = remainingMate(state);
  const isSolved = state.status === "solved";
  const canUndo = history.length > 1 && !isSolved;
  const reps = counts[problem.id] ?? 0;
  const isLastInSet = posInSet >= currentSet.length - 1;
  const globalNo = setIndex * setSize + posInSet + 1;

  const messageColor =
    message?.kind === "solved"
      ? "bg-emerald-600/90 text-white"
      : message?.kind === "correct"
        ? "bg-sky-600/80 text-white"
        : "bg-red-600/80 text-white";

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center p-4 gap-3">
      <div className="w-full max-w-[460px] flex items-center justify-between">
        <button
          onClick={() => setSetIndex(null)}
          className="text-sm text-zinc-400 hover:text-white"
          type="button"
        >
          ← セット
        </button>
        <span className="font-bold text-sm">
          {problem.mateIn}手詰め 第{globalNo}問
          <span className="text-zinc-400 font-normal">
            {" "}
            （{posInSet + 1}/{currentSet.length}）
          </span>
        </span>
        <span className="text-sm text-zinc-400">
          {isSolved ? "クリア！" : `残り${remaining}手`}
        </span>
      </div>

      <TsumeBoard
        position={state.position}
        lastMove={state.lastMove}
        interactive={state.status === "playing"}
        onMove={onMove}
      />
      {/* 盤面はcanvas描画でDOMに状態が出ないため、E2E検証用に状態をミラーする。 */}
      <div
        data-testid="tsume-status"
        data-solved={isSolved ? "1" : "0"}
        data-remaining={remaining}
        data-reps={reps}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      <div className="w-full max-w-[460px] flex items-center justify-between min-h-[2.5rem]">
        <span className="text-xs text-zinc-500">
          {reps > 0 ? `この問題 ${reps}回クリア` : "初挑戦"}
        </span>
        {message && (
          <div
            className={`px-4 py-1.5 rounded-full text-sm font-bold ${messageColor}`}
          >
            {message.text}
          </div>
        )}
        <span className="w-16" />
      </div>

      {hintLevel > 0 && hints && !isSolved && (
        <div className="w-full max-w-[460px] bg-zinc-800/70 rounded-xl p-3 text-sm space-y-1">
          {hintLevel >= 1 && <p className="text-amber-300">💡 {hints.piece}</p>}
          {hintLevel >= 2 && <p className="text-amber-200">💡 {hints.square}</p>}
          {hintLevel >= 3 && (
            <p className="text-amber-100 font-bold">💡 {hints.move}</p>
          )}
        </div>
      )}

      <div className="w-full max-w-[460px] grid grid-cols-2 gap-2">
        {!isSolved && (
          <button
            onClick={() => setHintLevel((l) => Math.min(3, l + 1))}
            disabled={hintLevel >= 3}
            className="py-2.5 rounded-lg font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-40 transition-colors"
            type="button"
          >
            {hintLevel === 0
              ? "ヒント"
              : hintLevel < 3
                ? "もっとヒント"
                : "ヒント全部"}
          </button>
        )}
        {canUndo && (
          <button
            onClick={() => {
              setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
              setMessage(null);
            }}
            className="py-2.5 rounded-lg font-bold bg-zinc-700 hover:bg-zinc-600 transition-colors"
            type="button"
          >
            1手戻る
          </button>
        )}
        {!isSolved && (
          <button
            onClick={() => {
              setHistory([startProblem(problem)]);
              setMessage(null);
              setHintLevel(0);
            }}
            className="py-2.5 rounded-lg font-bold bg-zinc-700 hover:bg-zinc-600 transition-colors"
            type="button"
          >
            最初から
          </button>
        )}
        {isSolved && !isLastInSet && (
          <button
            onClick={() => setPosInSet((p) => p + 1)}
            className="py-2.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 transition-colors col-span-2"
            type="button"
          >
            次の問題 →
          </button>
        )}
        {isSolved && isLastInSet && (
          <>
            <button
              onClick={() => setPosInSet(0)}
              className="py-2.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 transition-colors"
              type="button"
            >
              もう一周 ↻
            </button>
            <button
              onClick={() => setSetIndex(null)}
              className="py-2.5 rounded-lg font-bold bg-zinc-700 hover:bg-zinc-600 transition-colors"
              type="button"
            >
              セット一覧へ
            </button>
          </>
        )}
      </div>
    </div>
  );
}
