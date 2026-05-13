"use client";

import { useState } from "react";
import { GameView } from "@/components/GameView";

export default function Home() {
  const [started, setStarted] = useState(false);

  if (started) {
    return <GameView onBack={() => setStarted(false)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-2">ebishogi</h1>
          <p className="text-zinc-400 text-lg">
            AIと一緒に将棋を学ぼう
          </p>
        </div>

        <div className="w-full space-y-4 text-sm">
          <div className="bg-zinc-800/60 rounded-xl p-4 flex gap-3 items-start">
            <span className="text-2xl shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-amber-400">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-zinc-200">AIが候補手を提案</p>
              <p className="text-zinc-400 mt-0.5">
                考え中に盤上に矢印で候補手を表示。プロ級AIエンジンが最善手を教えてくれます
              </p>
            </div>
          </div>

          <div className="bg-zinc-800/60 rounded-xl p-4 flex gap-3 items-start">
            <span className="text-2xl shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-red-400">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-zinc-200">悪手をリアルタイム警告</p>
              <p className="text-zinc-400 mt-0.5">
                悪い手を指すとすぐに「悪手」「大悪手」と教えてくれるので、同じミスを繰り返しません
              </p>
            </div>
          </div>

          <div className="bg-zinc-800/60 rounded-xl p-4 flex gap-3 items-start">
            <span className="text-2xl shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-sky-400">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-zinc-200">ブラウザだけで動作</p>
              <p className="text-zinc-400 mt-0.5">
                将棋AIエンジン（YaneuraOu）がブラウザ内で動くので、インストール不要。すぐに遊べます
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setStarted(true)}
          className="w-full py-4 text-lg font-bold bg-amber-600 hover:bg-amber-500 active:bg-amber-700 rounded-xl transition-colors"
          type="button"
        >
          対局を始める
        </button>

        <p className="text-xs text-zinc-500 text-center">
          初回はAIエンジン（約200KB）のダウンロードに数秒かかります。
          <br />
          対局はすべてブラウザ内で処理され、サーバーに情報は送信されません。
        </p>
      </div>
    </div>
  );
}
