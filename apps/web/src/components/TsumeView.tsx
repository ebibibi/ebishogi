"use client";

import { useState, useEffect, useCallback } from "react";
import type { MoveOrDrop } from "shogiops/types";
import { TsumeBoard } from "./TsumeBoard";
import {
  problemsByMate,
  problemIndex,
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

const SOLVED_KEY = "ebishogi-tsume-solved-v1";

type Message = { text: string; kind: "correct" | "wrong" | "solved" } | null;

export function TsumeView({ onBack }: { onBack: () => void }) {
  const [mate, setMate] = useState<number>(3);
  const [problem, setProblem] = useState<TsumeProblem | null>(null);
  const [history, setHistory] = useState<TsumeState[]>([]);
  const [message, setMessage] = useState<Message>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [solved, setSolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOLVED_KEY);
      if (raw) setSolved(new Set(JSON.parse(raw)));
    } catch {
      /* localStorage 不可でも続行 */
    }
  }, []);

  const markSolved = useCallback((id: string) => {
    setSolved((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(SOLVED_KEY, JSON.stringify([...next]));
      } catch {
        /* 保存失敗は無視 */
      }
      return next;
    });
  }, []);

  const openProblem = useCallback((p: TsumeProblem) => {
    setProblem(p);
    setHistory([startProblem(p)]);
    setMessage(null);
    setHintLevel(0);
  }, []);

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
        markSolved(outcome.state.problem.id);
      } else {
        setMessage({ text: "正解！ いい手です", kind: "correct" });
      }
    },
    [state, markSolved],
  );

  // ── 問題一覧画面 ──────────────────────────────────────
  if (!problem || !state) {
    const list = problemsByMate(mate);
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center p-6">
        <div className="max-w-md w-full flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">詰将棋</h1>
            <button
              onClick={onBack}
              className="text-sm text-zinc-400 hover:text-white"
              type="button"
            >
              トップへ
            </button>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed">
            先手（あなた）が攻め方です。連続王手で相手玉を詰ませましょう。
            行き詰まったら「ヒント」を押すと段階的に教えてくれます。
          </p>

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

          <div className="grid grid-cols-4 gap-3">
            {list.map((p, i) => {
              const done = solved.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => openProblem(p)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center font-bold text-lg transition-colors ${
                    done
                      ? "bg-emerald-700/80 hover:bg-emerald-600 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  }`}
                  type="button"
                >
                  {i + 1}
                  {done && <span className="text-xs mt-0.5">クリア</span>}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-zinc-500 text-center">
            {mate}手詰め {list.filter((p) => solved.has(p.id)).length}/
            {list.length} 問クリア
          </p>
        </div>
      </div>
    );
  }

  // ── 出題・プレイ画面 ──────────────────────────────────
  const hints = buildHints(state);
  const remaining = remainingMate(state);
  const idx = problemIndex(problem);
  const isSolved = state.status === "solved";
  const canUndo = history.length > 1 && !isSolved;

  const arr = problemsByMate(problem.mateIn);
  const pos = arr.findIndex((p) => p.id === problem.id);
  const nextProblem = pos >= 0 && pos < arr.length - 1 ? arr[pos + 1] : null;

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
          onClick={() => setProblem(null)}
          className="text-sm text-zinc-400 hover:text-white"
          type="button"
        >
          ← 一覧へ
        </button>
        <span className="font-bold">
          {problem.mateIn}手詰め 第{idx}問
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
        style={{ display: "none" }}
        aria-hidden="true"
      />

      <div className="w-full max-w-[460px] min-h-[2.5rem] flex items-center justify-center">
        {message && (
          <div
            className={`px-4 py-1.5 rounded-full text-sm font-bold ${messageColor}`}
          >
            {message.text}
          </div>
        )}
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
        {isSolved && nextProblem && (
          <button
            onClick={() => openProblem(nextProblem)}
            className="py-2.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 transition-colors col-span-1"
            type="button"
          >
            次の問題 →
          </button>
        )}
        {isSolved && !nextProblem && (
          <button
            onClick={() => setProblem(null)}
            className="py-2.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 transition-colors"
            type="button"
          >
            一覧へ戻る
          </button>
        )}
      </div>
    </div>
  );
}
