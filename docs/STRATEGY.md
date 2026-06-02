# Drafter — 戦略メモ（コミュニティ・標準化・公式サイト・マネタイズ）

> 目的：1画面の作り込みを「AIにとって曖昧さのない視覚仕様」にし、
> **「drafter形式で画面を生成して」がAIのスタンダードになる**こと。
> 当面はコア機能を **MIT・無償** で提供する。

## 1. 競合landscape（2026 時点の調査）

**■ ほぼ同一コンセプト（先行例）**
- **Pencil.dev** — JSONの `.pen` を `/design` にgit管理。**MCP経由でClaude Codeがレイアウトを読み→React/HTML/CSS生成**。プロンプト→キャンバスでUI。2026/01公開、約10万ユーザー、無料early access。＝本構想そのもの。
- **OpenPencil**（OSS）— 上記のオープンソース版。「Design-as-Code」「prompt→ライブキャンバス」。

**■ 隣接（OSS設計ツール / design-to-code）**
- **Penpot** — OSSのFigma代替。design-as-code＋**公式MCPサーバ**＋AIホワイトペーパー。最も成熟。
- **Plasmic / Webstudio / Onlook** — ビジュアル編集→実コード、OSS。

**■ IR / 標準フォーマット**
- **Builder.io Mitosis** — JSON IR→React/Vue/Svelte/Angular/Qwik/Solid の多フレームワーク生成。「IRが標準」に最も近い。
- **Figma Dev Mode MCP / GLips Figma-Context-MCP(13k★)** — Figmaのレイアウトをエージェントに渡す。

**■ AI生成（prompt→UI）**
- **v0(Vercel)**＝コード生成、**Galileo**＝編集可能デザイン、**Uizard**＝スケッチ/複数画面。

### 結論
1. アイデアは新規ではなく、2026年に立ち上がった**激戦区**。先行者Pencil.devが「Claude＋JSON設計ファイル＋git」を体現済み。
2. ただし **OSS・VS Code非依存の単体Web・極小IR** の組み合わせには隙間が残る。
3. 「標準化」の鍵はファイル形式の優劣ではなく **①MCP対応 ②多フレームワーク生成 ③採用とエコシステム**。主要プレイヤーが全員MCPへ向かったのは必然。

## 2. Drafterの差別化（勝ち筋）
- **BYOA＝運営コスト$0**（ユーザー自身のAI）。OSSと相性最高。
- **極小・人間が直接書けるIR**（Penpot/Pencilより軽量・ハック容易）。
- **単体Web GUI**（VS Code/Cursor非依存、Electronの重さも無い）。
- **「1画面を完璧に＝AIの素材」に特化**した明快なニッチ。
- 標準を狙うには **MCPサーバ** と **React/TSX生成** がほぼ必須。

## 3. コミュニティ拡大 TODO（優先順）

**🔴 最優先（“AIに認知される”を本物にする）**
1. **Drafter MCPサーバ** — Claude/Cursor が `design.json` を直接読み書き（`read_design`/`write_design`/`edit_node`/`generate_html`/`validate`/`describe`）。「drafter形式で生成して」をAIの標準にする現実的な道。AGENTS.md＋JSON Schemaは布石済み。
2. **`npx drafter`** — devプラグインのAPIを独立サーバ化し、cloneせず起動可能に。採用障壁を下げる。
3. **ライブデモ＋GIF/動画** — READMEの最上部に。「触れる」が命。

**🟡 採用とエコシステム**
4. **React/TSX codegen**（多ターゲット化）。「design→実コード」を閉じる。
5. **テンプレのサムネ付きギャラリー**＋投稿の仕組み（コミュニティ資産化）。
6. **Show & Tell**：GitHub Discussions / Discord / `#madewithdrafter`。
7. **good first issue** ＋ ロードマップ公開（済）。テンプレ追加を最良の貢献入口に。

**🟢 認知**
8. ローンチ記事（Dev.to / Zenn / Hacker News / Product Hunt）、比較記事（vs Pencil/Penpot）。
9. プラグイン余地の明示（`codegen-react` 等）。

## 4. 多言語対応（i18n）
- **UI**：`editor/i18n.ts` に `ja`/`en` 辞書を作り `t("save")` 化。まず ja＋en（拡散に英語UI必須）、次に中/韓。軽量自前辞書でOK。
- **ドキュメント**：`README.md`（英語主）＋ `README.ja.md`、`docs/{en,ja}`。
- **テンプレ文言**：英語版 or 言語切替（今は不要）。

## 5. 公式ページ
- **静的サイト**（GitHub Pages / Vercel 無料枠、Astro か VitePress）。
- 構成：ヒーロー(30秒GIF) / 思想図(AI⇄GUI⇄コード) / **ブラウザで動くライブデモ** / クイックスタート / テンプレギャラリー / MCPの使い方 / ロードマップ / Discord。
- ドメイン例：`drafter.dev`（任意）。

## 6. マネタイズ（当面 無償、将来の選択肢）
オープンコア型を想定：
- **無料（MIT）**：エディタ・IR・codegen・BYOAのAI。
- **将来の有料**：①ホスティング版（チーム共有・クラウド保存）②マネージドAI（従量）③チーム機能（権限/履歴/コメント）④プレミアムテンプレ/部品マーケット（収益分配）⑤企業向けサポート/SLA。
- 初期は **GitHub Sponsors / Open Collective**。

## 7. 推奨の次の一手
**①MCPサーバ → ②英語UI(i18n) → ③公式ページ(ライブデモ)** の順。
これで「AIがdrafter形式をネイティブに扱える＋世界中が試せる」状態になり、標準化と拡大の両輪が回り始める。

## 付録：理念（再掲）
- AIが作った画面を**GUIで微修正**できる。
- 手動でこのツールで作ったものを**AIで手直し**できる。
- 将来、`.md`/`.yaml` 的な拡張での編集も視野（**今はやらない**）。
- `design.json` を唯一の真実とし、**コード→IRの逆方向はやらない**。

---

### 出典（調査）
- Pencil.dev: https://www.pencil.dev/ ／ https://betterstack.com/community/guides/ai/pencil-ai/
- OpenPencil: https://github.com/ZSeven-W/openpencil
- Penpot: https://penpot.app/ ／ MCP: https://github.com/penpot/penpot-mcp
- Mitosis: https://mitosis.builder.io/ ／ https://github.com/BuilderIO/mitosis
- Figma Dev Mode MCP: https://www.figma.com/blog/introducing-figma-mcp-server/
- 比較: https://medium.com/@js_9954/the-best-ai-tools-for-product-and-ux-designers-november-2025-cb64909a5a15
