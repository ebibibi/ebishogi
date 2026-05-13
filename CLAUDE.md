# ebishogi

AI支援付き将棋学習プラットフォーム。対局中にリアルタイムでAIアシストを受けながら将棋を学べる。

## プロジェクト構成

```
ebishogi/
├── apps/web/           # Next.js (App Router) + TypeScript + Tailwind
├── packages/
│   ├── shogi-core/     # 将棋ルール・型定義（UI無依存、サーバーでも使える）
│   └── shogi-engine/   # USIプロトコル・WebAssemblyエンジン統合
├── turbo.json          # Turborepo設定
└── pnpm-workspace.yaml # pnpmワークスペース
```

## 技術スタック

- **フレームワーク**: Next.js + TypeScript
- **スタイリング**: Tailwind CSS
- **パッケージ管理**: pnpm + Turborepo
- **将棋エンジン**: YaneuraOu WASM（クライアントサイド、Web Worker）
- **盤面UI**: 自前実装（GPL回避のためshogiground不使用）
- **将棋ルール**: 自前実装（GPL回避のためshogiops不使用）

## 開発コマンド

```bash
export PATH="$HOME/.npm-global/bin:$PATH"  # pnpmにPATHを通す
pnpm install                                # 依存インストール
pnpm dev                                    # 開発サーバー起動
pnpm build                                  # 全パッケージビルド
pnpm --filter web run dev                   # Webアプリのみ起動
pnpm --filter @ebishogi/shogi-core run build  # コアのみビルド
```

## アーキテクチャ方針

- **shogi-core はUI無依存**: Node.jsでもブラウザでも動く。将来の対人戦でサーバーサイドの手検証に使う
- **GameConnection インターフェース**: CPU戦（LocalGameConnection）と対人戦（WebSocketGameConnection）を同じAPIで扱えるように設計
- **クライアント完結**: CPU戦ではサーバー不要。エンジンはブラウザ内WebWorkerで動作
- **GPL回避**: shogiground/shogiopsはGPL-3.0のため不使用。同等機能を自前実装

## ライセンス注意

- このリポジトリはプライベート
- lishogiのコードを読んで設計を参考にしているが、コードのコピーはしていない
- YaneuraOu WASMはGPL-3.0 — 将来的にWASMバイナリの扱いを確認する必要あり

## コーディング規約

`~/.claude/rules/` の共通ルールに従う。

## 言語

プライベートリポジトリのため日本語。
