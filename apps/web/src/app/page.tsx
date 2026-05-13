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
          <h1 className="text-5xl font-bold tracking-tight mb-3">ebishogi</h1>
          <p className="text-zinc-300 text-lg font-medium">
            指しながら、強くなる
          </p>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed max-w-sm mx-auto">
            対局が終わってから振り返るのではなく、
            一手一手にAIがリアルタイムで寄り添う。
            対局しながら感想戦をしているような、新しい将棋の学び方。
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
              <p className="font-semibold text-zinc-200">段階的にヒントが現れる</p>
              <p className="text-zinc-400 mt-0.5">
                すぐに答えは出しません。長考していると3番手、2番手、1番手の順に候補手が盤上に現れます。まず自分で考えてから確認できます
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
              <p className="font-semibold text-zinc-200">悪手をその場で指摘</p>
              <p className="text-zinc-400 mt-0.5">
                悪い手を指すと「悪手」「大悪手」とすぐにフィードバック。対局後の分析を待たずに、その瞬間に気づきを得られます
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
                将棋AIエンジンがブラウザ内で動くので、インストール不要。開いてすぐに遊べます
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
