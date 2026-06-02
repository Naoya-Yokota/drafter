# Drafter (working name)

GUIで画面レイアウトを設計し、コード（まずHTML、将来 Unity / モバイル）へコンパイルするツール。
AIによる生成・GUIでの微調整・コメント駆動の修正を、すべて**1つの中間表現(IR)**を中心に統一する。

> AI ⇄ GUI ⇄ コード を行き来できる。AIは各自の Claude Code / Codex（持ち込み）で動かす想定なので、
> プロジェクト運営側のAI費用は **$0**。

## 中心思想：すべては IR (`design.json`) を介する

```
        design.json  ← 唯一の真実 (Single Source of Truth, JSON)
         ↑    ↑     ↑
     GUI編集  AI生成/修正  コード生成
    (双方向)  (双方向)    (一方向: IR→コード)
```

GUIもAIも**コードを直接いじらない**。全員が `design.json` を読み書きし、コードはそこから生成する。
これにより「AI作成→GUI微調整→コード化」「人間作成→GUI微調整→コード化」が**同じ1本の流れ**になる。

- 保存形式は **JSON**（zodで検証）。diff / Git / Claude Code の文字列編集が全部タダで効く。
- コメントは**ノードの中**(`node.comments[]`)に持つ。コメント駆動のAI修正の燃料で、Gitで追える。

## 現状（Phase 1 — GUIエディタが動く）

**コア（Phase 0）**

- `src/ir/schema.ts` — IRスキーマ＋型＋検証（zod）。**プロジェクトの核**。
- `src/codegen/html.ts` — IR → スタンドアロンHTML（絶対配置でGUIキャンバスを忠実に再現）。
- `src/cli.ts` — `design.json` を検証し、未解決コメントを一覧し、HTMLを生成。
- `examples/design.json` — ログイン画面のサンプル（コメント1件付き）。

**Webエディタ（Phase 1, `editor/`）— AI不使用のGUI編集ループ**

- `editor/components/Canvas.tsx` — `html.ts` と同じマッピングで忠実描画。クリック選択・ドラッグ移動・ハンドルでリサイズ → `frame` を直接更新。
- `editor/components/Inspector.tsx` — 選択ノードの `frame`/`style`/`props` を編集。
- `editor/components/Tree.tsx` — レイヤーツリー。`editor/components/Preview.tsx` — `generateHtml` の出力を iframe でライブ表示（**codegenそのもの＝AIを介さない**ことの証明）。
- `vite.config.ts` の dev プラグイン `/api/design` — ディスク上の `design.json` を zod 検証して read/write。**GUI編集が実ファイル変更になり、git / Claude Code 連携がそのまま効く**。

> 重要：GUIで直した内容は `design.json` → `codegen` で**そのままコードになる**。AIは一切通らない。
> AIは Phase 2 で「コメントで自然言語修正したい時だけ」使うオプション機能。

### 使い方

```bash
npm install

# GUIエディタ（ドラッグ編集 → Ctrl+S で design.json 保存 → ライブHTMLプレビュー）
npm run dev

# CLI: IR → out/index.html を生成
node src/cli.ts examples/design.json out
node src/cli.ts examples/design.json --check  # 検証＋未解決コメント一覧のみ（生成しない）
```

生成HTMLは `<!-- DRAFTER:BEGIN -->` / `<!-- DRAFTER:END -->` で囲まれる。
将来、マーカー外の手書きコードを壊さず再生成できるようにするため。

## ロードマップ

- **Phase 0 ✅** IRスキーマ + HTML生成 + CLI + サンプル
- **Phase 1 ✅** 独自Webエディタ（Vite + React）。ドラッグ移動/リサイズ・スナップ整列・選択・プロパティ編集・追加/削除・コピペ/複製・Undo/Redo・z順序・整列・ズーム・画面サイズ・実コンポーネント描画・flexオートレイアウト・HTML書き出し。豊富なコンポーネント（フォーム/表示/ナビ、Accordion・NavBarは生成HTMLで開閉動作）
- **Phase 2 🚧** コメント機能 + 「AIで修正」ボタン。裏で `claude` をヘッドレス起動し `design.json` を更新（方向A: BYOA）。実装済み（要 `claude` CLI）。差分承認UIは今後
- **Phase 3** MCPサーバ公開（方向B: Claude Code から `resolve_comments` 等を直接呼ぶ）。Unity / モバイル codegen を追加

## 設計上の約束

- **codegen はプラグイン**：`IR → string` の関数の集まり。`codegen-unity` 等を同じIRから足せる。
- **AIに送る量を最小化**：画面全体ではなく対象ノード＋周辺だけを渡す。これがコスト管理の肝。
- **逆方向（コード→IR）は当面やらない**：IR→コードの一方向に割り切る。

## ライセンス

MIT
