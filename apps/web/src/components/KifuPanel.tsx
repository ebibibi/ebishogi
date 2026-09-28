"use client";

import { useState, type ReactNode } from "react";
import {
  decodeKifuBytes,
  makeKif,
  makeUsiPosition,
  parseKifu,
  type GameRecord,
  type KifMeta,
} from "@/lib/kifu";

type Props = {
  record: GameRecord;
  meta: KifMeta;
  /** 読み込んだ棋譜で対局を置き換える。 */
  onLoad: (record: GameRecord) => void;
  onClose: () => void;
};

type Notice = { kind: "info" | "error"; text: string } | null;

export function KifuPanel({ record, meta, onLoad, onClose }: Props) {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  const kif = () => makeKif(record, meta);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ kind: "info", text: `${label}をコピーしました` });
    } catch {
      setNotice({ kind: "error", text: "コピーできませんでした" });
    }
  };

  const loadText = (source: string) => {
    const result = parseKifu(source);
    if (!result.ok) {
      setNotice({ kind: "error", text: result.error });
      return;
    }
    onLoad(result.value);
  };

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      loadText(decodeKifuBytes(await file.arrayBuffer()));
    } catch {
      setNotice({ kind: "error", text: "ファイルを読めませんでした" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        role="presentation"
      />
      <div
        className="relative z-10 bg-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        role="dialog"
        aria-labelledby="kifu-panel-title"
      >
        <h2 id="kifu-panel-title" className="text-lg font-bold mb-4">
          棋譜
        </h2>

        <section className="mb-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">
            保存（{record.moves.length}手）
          </h3>
          <div className="flex flex-wrap gap-2">
            <PanelButton primary onClick={() => downloadKif(kif())}>
              KIFをダウンロード
            </PanelButton>
            <PanelButton onClick={() => copy("KIF", kif())}>
              KIFをコピー
            </PanelButton>
            <PanelButton
              onClick={() => copy("USI", makeUsiPosition(record))}
            >
              USIをコピー
            </PanelButton>
          </div>
        </section>

        <section className="mb-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">読込</h3>
          <p className="text-xs text-zinc-500 mb-2">
            KIF・SFEN・USI（position …）に対応。読み込むと今の対局は置き換わり、
            1手目から再生できます。途中の局面から「ここから再開」で続きを指せます。
          </p>
          <label className="block mb-2">
            <span className="sr-only">棋譜ファイル</span>
            <input
              type="file"
              accept=".kif,.kifu,.txt,text/plain"
              aria-label="棋譜ファイル"
              onChange={(e) => loadFile(e.target.files?.[0])}
              className="block w-full text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-zinc-200"
            />
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ここに棋譜を貼り付け"
            aria-label="棋譜テキスト"
            rows={4}
            className="w-full rounded-lg bg-zinc-900 p-2 text-xs text-zinc-200 font-mono mb-2"
          />
          <PanelButton
            primary
            disabled={text.trim().length === 0}
            onClick={() => loadText(text)}
          >
            貼り付けた棋譜を読み込む
          </PanelButton>
        </section>

        {notice && (
          <p
            role={notice.kind === "error" ? "alert" : "status"}
            className={`text-xs mb-3 ${
              notice.kind === "error" ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {notice.text}
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm"
          type="button"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

function PanelButton({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs disabled:opacity-40 ${
        primary
          ? "bg-amber-600 hover:bg-amber-500 text-white"
          : "bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

/** UTF-8 で書くので拡張子は .kifu（.kif は Shift_JIS が慣例）。 */
function downloadKif(content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ebishogi_${timestamp(new Date())}.kifu`;
  a.click();
  // 即座に破棄するとダウンロードが始まる前に URL が消えるブラウザがある
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timestamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
