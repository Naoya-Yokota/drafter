# Drafter

**An IR-centric UI design tool.** Lay out any single screen in a GUI, compile it
to code (HTML today), and hand the `design.json` to an AI as a precise visual
spec. Designed so that **humans, the GUI, and AI all edit one source of truth.**

> GUI で1画面を作り込み → コードへコンパイル → `design.json` を「曖昧さのない視覚仕様」として AI に渡す。
> AI ⇄ GUI ⇄ コード を、すべて **1つの中間表現 (IR)** を中心に往復できます。

```
            ┌─────────────────────────────┐
   GUI編集 ─┤                             │
            │      design.json (IR)       ├─→ codegen ─→ HTML (将来: React/TSX 等)
   AI生成/  ┤   ＝唯一の真実 (zod + JSON   │
   修正  ───┤      Schema で検証)          │
            │                             │
   手書き  ─┤                             │
            └─────────────────────────────┘
```

GUI も AI も**コードを直接いじらず**、全員が `design.json` を読み書きします。コードはそこから一方向に生成。

## Quick start

```bash
npm install
npm run dev        # GUIエディタ → http://localhost:5173
```

```bash
# CLI: IR → out/index.html
node src/cli.ts examples/design.json out
node src/cli.ts examples/design.json out --check   # 検証＋未解決コメント一覧のみ
```

## What it does

- **WYSIWYG キャンバス** — ドラッグ移動/リサイズ、整列スナップ＋ガイド、範囲(マーキー)選択、まとめて移動/整列/等間隔配置、ズーム、実コンポーネント描画。
- **豊富な部品** — Frame / Text / Button / Image / Input / Rectangle / Link / Textarea / Checkbox / Switch / Select / Divider / Badge / Avatar / List / Accordion / NavBar / **Embed(地図/動画 iframe)** / Icon / ProgressBar。Accordion・NavBar は生成HTMLで実際に開閉。
- **編集体験** — Undo/Redo、コピー/ペースト/複製、グループ化、ロック/非表示、z順序、整列ボタン、数式入力(`120+8`)、ダブルクリックでテキスト編集、コマンドパレット(Ctrl+K)。
- **カラー** — パレット＋グラデ＋最近色＋ドキュメント色＋スポイト。
- **flex オートレイアウト** — Frame を flex コンテナに。
- **50 テンプレ** — 10カテゴリ × 5（ランディング/認証/ダッシュボード/料金/プロフィール/EC/地図/チャット/設定/メディア）。
- **ライブHTMLプレビュー** — `generateHtml` の出力をリアルタイム表示（＝コード化にAIは不要）。
- **AI（BYOA, 任意）** — 自分の `claude` CLI を裏で使う：
  - **AIで生成** — プロンプトから新規 `design.json`。
  - **AIで修正** — ノードにコメント→IRを更新。
  - **AIパック書き出し** — 説明＋`design.json`＋HTMLを1ファイルに（下流AIへの最良のプロンプト）。

## For AI agents / tooling

- IR の機械可読仕様: [`schema/design.schema.json`](schema/design.schema.json)（JSON Schema）
- AI 向けガイド（IRの読み書き方）: [`AGENTS.md`](AGENTS.md)
- IR の TypeScript / zod 定義: [`src/ir/schema.ts`](src/ir/schema.ts)

## Architecture

- `src/ir/schema.ts` — IR（zod）。**プロジェクトの核**。
- `src/codegen/html.ts` — `IR → HTML`（純粋関数、プラグイン構成）。
- `src/cli.ts` — 検証＋生成 CLI。
- `editor/` — Vite + React の GUI エディタ。
- `schema/` — 公開 JSON Schema。

設計の約束: **コード→IR の逆方向はやらない**（IRが唯一の真実）。codegen はプラグインなので、同じIRから React/TSX・Unity・モバイル等のターゲットを追加できます。

## Status & roadmap

Phase 0/1 完了：IR・HTML codegen・CLI・GUIエディタ・50テンプレ・AI(BYOA)。
Figma 機能パリティの計画は [`ROADMAP.md`](ROADMAP.md) を参照。

## AI（BYOA）について

「AIで生成 / 修正」は**あなた自身の `claude` CLI**をローカルで起動します（コストはあなた持ち＝BYOA）。
未導入でも他の全機能はそのまま動きます。dev サーバの `/api/*` はローカル開発専用で、ファイル操作はプロジェクト内に限定しています。

## License

MIT — see [LICENSE](LICENSE).
