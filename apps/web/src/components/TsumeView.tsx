"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { GameView } from "./GameView";
import { problemsByMate, MATE_LEVELS } from "@/lib/tsume/problems";
import { AdBanner } from "@/components/AdBanner";
import { AD_SLOTS } from "@/lib/ad-slots";

// 解答回数（id → 解いた回数）。反復練習の可視化に使う。
const COUNTS_KEY = "ebishogi-tsume-counts-v1";
const SET_SIZES = [10, 50, 100] as const;
const YANEURAOU_URL =
  "https://yaneuraou.yaneu.com/2020/12/25/christmas-present/";

type Result = "solved" | "failed" | null;

export function TsumeView({ onBack }: { onBack: () => void }) {
  const [mate, setMate] = useState(3);
  const [setSize, setSetSize] = useState<number>(10);
  const [setIndex, setSetIndex] = useState<number | null>(null); // null=セット選択画面
  const [posInSet, setPosInSet] = useState(0);
  const [attempt, setAttempt] = useState(0); // 「もう一度」で増やし GameView を再マウント
  const [result, setResult] = useState<Result>(null);
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

  const openSet = useCallback((idx: number) => {
    setSetIndex(idx);
    setPosInSet(0);
    setAttempt(0);
    setResult(null);
  }, []);

  const backToList = useCallback(() => {
    setSetIndex(null);
    setResult(null);
  }, []);

  // ── セット選択画面 ─────────────────────────────────────
  if (setIndex === null) {
    const solvedInMate = mateProblems.filter(
      (p) => (counts[p.id] ?? 0) > 0,
    ).length;
    const totalReps = mateProblems.reduce((s, p) => s + (counts[p.id] ?? 0), 0);

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
            先手（あなた）が攻め方。連続王手で相手玉を詰ませましょう。受け方は将棋AIが
            最善で逃げるので、<strong>自由にどんな手でも</strong>指せます。実戦から生まれた
            詰将棋なので<strong>駒余りもOK</strong>。同じセットを繰り返し解いて棋力アップ！
            解いた回数は自動で記録されます。
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
              const set = mateProblems.slice(i * setSize, i * setSize + setSize);
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

  // 準備中（セット末尾を超えた等の保険）
  if (!problem) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <button
          onClick={backToList}
          className="px-4 py-2 rounded-lg bg-zinc-700"
          type="button"
        >
          セット一覧へ
        </button>
      </div>
    );
  }

  // ── 実行画面（自由対局：攻め方=人間、受け方=エンジン）─────────
  const hasNext = posInSet < currentSet.length - 1;
  const globalNo = setIndex * setSize + posInSet + 1;
  const reps = counts[problem.id] ?? 0;

  return (
    <div className="relative">
      <GameView
        key={`${problem.id}-${attempt}`}
        initialSfen={problem.sfen}
        onBack={backToList}
        tsume={{
          onSolved: () => {
            recordSolve(problem.id);
            setResult("solved");
          },
          onFailed: () => setResult("failed"),
        }}
      />

      {/* 問題番号バッジ（左上・操作を邪魔しない） */}
      <div className="fixed top-2 left-2 z-40 text-xs bg-zinc-800/80 rounded px-2 py-1 pointer-events-none">
        {problem.mateIn}手詰め 第{globalNo}問
        {reps > 0 && <span className="text-emerald-400"> ・{reps}回クリア</span>}
      </div>

      {/* 状態ミラー（E2E・アクセシビリティ用） */}
      <div
        data-testid="tsume-status"
        data-result={result ?? ""}
        data-problem={problem.id}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      {/* 結果オーバーレイ */}
      {result && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="bg-zinc-800/95 rounded-2xl p-3 flex flex-col items-center gap-2 shadow-2xl max-w-[460px] w-full">
            <span
              className={`font-bold ${
                result === "solved" ? "text-emerald-400" : "text-amber-300"
              }`}
            >
              {result === "solved"
                ? "正解！🎉 詰みました"
                : "残念… 自玉が詰みました"}
            </span>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  setAttempt((a) => a + 1);
                  setResult(null);
                }}
                className="flex-1 py-2.5 rounded-lg font-bold bg-zinc-700 hover:bg-zinc-600 transition-colors"
                type="button"
              >
                もう一度
              </button>
              {hasNext && (
                <button
                  onClick={() => {
                    setPosInSet((p) => p + 1);
                    setAttempt(0);
                    setResult(null);
                  }}
                  className="flex-1 py-2.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 transition-colors"
                  type="button"
                >
                  次の問題 →
                </button>
              )}
              <button
                onClick={backToList}
                className="flex-1 py-2.5 rounded-lg font-bold bg-zinc-700 hover:bg-zinc-600 transition-colors"
                type="button"
              >
                一覧へ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
