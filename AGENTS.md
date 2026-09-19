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
- **将棋ルール**: shogiops（GPL-3.0、合法手判定・局面管理）
- **盤面UI**: 自前Reactコンポーネント（shogiopsのデータを使用）
- **ライセンス**: GPL-3.0（オープンソース公開）

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
- **GPL-3.0 オープンソース**: shogiops等のGPLライブラリを活用。ソースは公開

## ライセンス

GPL-3.0。このリポジトリはパブリック。広告付き無料サービスとして運営。

## デプロイ

- Cloudflare Pages（静的エクスポート）
- ドメイン: shogi.ebisuda.net

## 言語

パブリックリポジトリだが個人プロジェクトのため日本語。
