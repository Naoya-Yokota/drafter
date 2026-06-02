import type { Document, Node, NodeType, Style } from "../src/ir/schema.ts";

/**
 * Rich starter templates, authored with a compact builder DSL. Every template
 * is a single, fully-designed screen — the goal is "lay out anything for one
 * screen", as material to later hand to an AI. No backend behavior, pure layout.
 */
export type Template = { id: string; label: string; category: string; doc: Document };

let _n = 0;
const uid = (t: string) => `${t.toLowerCase()}_${(_n++).toString(36)}`;

function node(type: NodeType, x: number, y: number, w: number, h: number, extra: Partial<Node> = {}): Node {
  return { id: uid(type), type, name: type, frame: { x, y, w, h }, ...extra };
}
const txt = (x: number, y: number, w: number, h: number, text: string, style: Style = {}) => node("Text", x, y, w, h, { props: { text }, style });
const btn = (x: number, y: number, w: number, h: number, label: string, style: Style = {}) => node("Button", x, y, w, h, { props: { label }, style: { background: "#4f46e5", color: "#fff", borderRadius: 8, border: "none", fontSize: 15, fontWeight: 600, ...style } });
const frame = (x: number, y: number, w: number, h: number, style: Style = {}, children: Node[] = []) => node("Frame", x, y, w, h, { style, children });
const rect = (x: number, y: number, w: number, h: number, style: Style = {}) => node("Rectangle", x, y, w, h, { style });
const img = (x: number, y: number, w: number, h: number, src = "", style: Style = {}) => node("Image", x, y, w, h, { props: { src }, style: { background: "#e2e8f0", ...style } });
const icon = (x: number, y: number, w: number, h: number, t: string, style: Style = {}) => node("Icon", x, y, w, h, { props: { text: t }, style: { fontSize: 28, ...style } });
const inp = (x: number, y: number, w: number, h: number, placeholder: string, style: Style = {}) => node("Input", x, y, w, h, { props: { placeholder }, style: { border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, background: "#fff", ...style } });
const badge = (x: number, y: number, w: number, h: number, t: string, style: Style = {}) => node("Badge", x, y, w, h, { props: { text: t }, style });
const avatar = (x: number, y: number, w: number, h: number, t: string, style: Style = {}) => node("Avatar", x, y, w, h, { props: { text: t }, style });
const divider = (x: number, y: number, w: number, h: number, style: Style = {}) => node("Divider", x, y, w, h, { style: { background: "#e5e7eb", ...style } });
const progress = (x: number, y: number, w: number, h: number, value: number, style: Style = {}) => node("ProgressBar", x, y, w, h, { props: { value }, style: { borderRadius: 999, ...style } });
const embed = (x: number, y: number, w: number, h: number, src: string, style: Style = {}) => node("Embed", x, y, w, h, { props: { src }, style: { borderRadius: 12, border: "1px solid #e5e7eb", ...style } });
const navbar = (w: number, title: string, items: string[], style: Style = {}) => node("NavBar", 0, 0, w, 64, { props: { title, items, collapsible: false }, style: { background: "#ffffff", color: "#0f172a", fontSize: 15, fontWeight: 600, ...style } });
const list = (x: number, y: number, w: number, h: number, items: string[], style: Style = {}) => node("List", x, y, w, h, { props: { items }, style: { fontSize: 15, color: "#334155", ...style } });
const link = (x: number, y: number, w: number, h: number, text: string, style: Style = {}) => node("Link", x, y, w, h, { props: { text, href: "#" }, style: { color: "#4f46e5", fontSize: 14, ...style } });
const card = (x: number, y: number, w: number, h: number, children: Node[], style: Style = {}) => frame(x, y, w, h, { background: "#ffffff", borderRadius: 16, border: "1px solid #eef0f4", shadow: "0 6px 20px rgba(16,24,40,0.06)", ...style }, children);

const MAP = "https://www.openstreetmap.org/export/embed.html?bbox=139.69,35.68,139.715,35.70&layer=mapnik";
const YT = "https://www.youtube.com/embed/dQw4w9WgXcQ";

function screen(name: string, w: number, h: number, bg: string, children: Node[]): Document {
  return { version: "0.1", name, canvas: { width: w, height: h, background: bg }, root: { id: "screen", type: "Frame", name: "Screen", frame: { x: 0, y: 0, w, h }, style: { background: bg }, children } };
}

function statCard(x: number, y: number, w: number, label: string, value: string, accent: string): Node {
  return card(x, y, w, 104, [
    txt(20, 18, w - 40, 18, label, { fontSize: 13, color: "#64748b" }),
    txt(20, 40, w - 40, 36, value, { fontSize: 28, fontWeight: 800, color: "#0f172a" }),
    rect(20, 86, 40, 4, { background: accent, borderRadius: 999 }),
  ]);
}
function field(x: number, y: number, w: number, label: string, ph: string): Node[] {
  return [txt(x, y, w, 18, label, { fontSize: 13, color: "#475569", fontWeight: 600 }), inp(x, y + 24, w, 46, ph)];
}

const T: Template[] = [];
const add = (category: string, label: string, doc: Document) => T.push({ id: uid("tpl"), category, label, doc });

/* ─────────────── ランディング ─────────────── */
add("ランディング", "ヒーロー（グラデ）", screen("Landing Hero", 1280, 900, "#0b1020", [
  rect(0, 0, 1280, 560, { background: "linear-gradient(135deg, #4f46e5, #9333ea)" }),
  navbar(1280, "Nova", ["製品", "事例", "料金", "会社"], { background: "transparent", color: "#fff" }),
  badge(440, 150, 400, 30, "🚀 新しい働き方を、今すぐ", { background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 14 }),
  txt(240, 200, 800, 120, "アイデアを、最速でカタチに。", { fontSize: 56, fontWeight: 800, color: "#fff", textAlign: "center" }),
  txt(340, 330, 600, 60, "デザインからコードまで、ひとつの流れで。", { fontSize: 20, color: "#e0e7ff", textAlign: "center" }),
  btn(490, 420, 140, 52, "無料で始める", { background: "#fff", color: "#4f46e5" }),
  btn(650, 420, 140, 52, "デモを見る", { background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }),
  card(240, 600, 800, 230, [embed(20, 20, 760, 190, YT, { border: "none" })]),
]));
add("ランディング", "特徴3カラム", screen("Features", 1280, 820, "#ffffff", [
  navbar(1280, "Flux", ["機能", "価格", "ブログ"]),
  txt(340, 120, 600, 44, "あなたのチームに必要な全て", { fontSize: 36, fontWeight: 800, textAlign: "center", color: "#0f172a" }),
  txt(390, 176, 500, 24, "シンプルで強力な3つの柱", { fontSize: 16, color: "#64748b", textAlign: "center" }),
  ...[0, 1, 2].map((i) => card(160 + i * 340, 260, 300, 300, [
    frame(24, 24, 56, 56, { background: ["#eef2ff", "#ecfdf5", "#fef2f2"][i], borderRadius: 14 }, [icon(14, 12, 28, 32, ["⚡", "🔒", "📈"][i])]),
    txt(24, 100, 252, 28, ["高速", "安全", "成長"][i], { fontSize: 20, fontWeight: 700 }),
    txt(24, 138, 252, 120, "説明テキストがここに入ります。価値を端的に伝えましょう。", { fontSize: 14, color: "#64748b", lineHeight: 1.6 }),
  ])),
]));
add("ランディング", "CTAバナー", screen("CTA", 1280, 520, "#f8fafc", [
  card(160, 120, 960, 280, [
    rect(0, 0, 960, 280, { background: "linear-gradient(120deg, #111827, #4f46e5)", borderRadius: 16 }),
    txt(80, 70, 600, 50, "今日から、もっと速く。", { fontSize: 40, fontWeight: 800, color: "#fff" }),
    txt(80, 130, 560, 26, "14日間の無料トライアル。クレジットカード不要。", { fontSize: 17, color: "#c7d2fe" }),
    btn(80, 186, 180, 54, "アカウント作成", { background: "#fff", color: "#111827" }),
  ], { shadow: "0 20px 60px rgba(79,70,229,0.25)" }),
]));
add("ランディング", "ロゴ＋実績", screen("Social Proof", 1280, 700, "#ffffff", [
  navbar(1280, "Beam", ["特徴", "導入事例", "料金"]),
  txt(290, 130, 700, 44, "10,000社以上が選ぶ理由", { fontSize: 36, fontWeight: 800, textAlign: "center" }),
  ...[0, 1, 2, 3].map((i) => statCard(120 + i * 270, 240, 240, ["稼働率", "導入企業", "削減時間", "満足度"][i], ["99.9%", "10k+", "40%", "4.9★"][i], ["#4f46e5", "#10b981", "#f59e0b", "#ec4899"][i])),
  divider(120, 400, 1040, 1),
  txt(120, 440, 1040, 26, "「導入してから業務が劇的に変わりました」 — 株式会社サンプル CTO", { fontSize: 18, color: "#334155", textAlign: "center" }),
]));
add("ランディング", "ニュースレター", screen("Newsletter", 900, 560, "#0f172a", [
  rect(0, 0, 900, 560, { background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }),
  icon(420, 120, 60, 60, "✉️", { fontSize: 52 }),
  txt(150, 210, 600, 44, "最新情報をお届けします", { fontSize: 34, fontWeight: 800, color: "#fff", textAlign: "center" }),
  txt(200, 270, 500, 24, "週に一度、厳選したニュースだけ。", { fontSize: 16, color: "#94a3b8", textAlign: "center" }),
  inp(250, 330, 280, 52, "メールアドレス", { fontSize: 16 }),
  btn(540, 330, 120, 52, "登録", { background: "#22d3ee", color: "#0f172a" }),
]));

/* ─────────────── 認証 ─────────────── */
add("認証", "ログイン（カード）", screen("Login", 1280, 820, "#eef2ff", [
  card(440, 170, 400, 480, [
    avatar(168, 40, 64, 64, "N", { background: "#4f46e5", color: "#fff", fontWeight: 700 }),
    txt(40, 124, 320, 30, "おかえりなさい", { fontSize: 24, fontWeight: 800, textAlign: "center" }),
    txt(40, 158, 320, 22, "アカウントにログイン", { fontSize: 14, color: "#64748b", textAlign: "center" }),
    ...field(40, 210, 320, "メール", "you@example.com"),
    ...field(40, 296, 320, "パスワード", "••••••••"),
    btn(40, 384, 320, 48, "ログイン"),
    link(40, 446, 320, 20, "パスワードを忘れた方", { textAlign: "center", color: "#64748b" }),
  ]),
]));
add("認証", "サインアップ（2カラム）", screen("Sign up", 1280, 820, "#ffffff", [
  rect(0, 0, 560, 820, { background: "linear-gradient(160deg, #4f46e5, #9333ea)" }),
  txt(60, 120, 440, 50, "はじめましょう。", { fontSize: 40, fontWeight: 800, color: "#fff" }),
  txt(60, 184, 420, 60, "数分で完了。今日からチームの生産性を上げましょう。", { fontSize: 17, color: "#e0e7ff", lineHeight: 1.6 }),
  divider(0, 0, 1, 820, { background: "transparent" }),
  txt(700, 150, 400, 34, "アカウント作成", { fontSize: 26, fontWeight: 800 }),
  ...field(700, 220, 400, "お名前", "山田 太郎"),
  ...field(700, 306, 400, "メール", "you@example.com"),
  ...field(700, 392, 400, "パスワード", "8文字以上"),
  btn(700, 480, 400, 50, "登録する"),
  txt(700, 548, 400, 20, "既にアカウントをお持ちですか？ ログイン", { fontSize: 13, color: "#64748b", textAlign: "center" }),
]));
add("認証", "ソーシャルログイン", screen("Social Login", 460, 760, "#f8fafc", [
  card(40, 80, 380, 600, [
    txt(40, 40, 300, 30, "ログイン", { fontSize: 24, fontWeight: 800, textAlign: "center" }),
    btn(40, 100, 300, 50, "Googleで続ける", { background: "#fff", color: "#111827", border: "1px solid #d1d5db" }),
    btn(40, 162, 300, 50, "Appleで続ける", { background: "#111827", color: "#fff" }),
    btn(40, 224, 300, 50, "GitHubで続ける", { background: "#1f2937", color: "#fff" }),
    divider(40, 300, 300, 1),
    txt(170, 290, 40, 20, "or", { fontSize: 12, color: "#94a3b8", background: "#fff", textAlign: "center" }),
    ...field(40, 330, 300, "メール", "you@example.com"),
    btn(40, 416, 300, 48, "メールで続ける"),
  ]),
]));
add("認証", "OTP認証", screen("Verify", 460, 700, "#eef2ff", [
  card(40, 120, 380, 420, [
    icon(160, 40, 60, 60, "🔐", { fontSize: 48 }),
    txt(40, 120, 300, 28, "コードを入力", { fontSize: 22, fontWeight: 800, textAlign: "center" }),
    txt(40, 154, 300, 40, "you@example.com に送信した6桁の番号", { fontSize: 13, color: "#64748b", textAlign: "center" }),
    ...[0, 1, 2, 3].map((i) => inp(46 + i * 74, 210, 60, 64, "", { fontSize: 24, textAlign: "center" })),
    btn(40, 300, 300, 48, "確認"),
    link(40, 360, 300, 20, "コードを再送信", { textAlign: "center", color: "#64748b" }),
  ]),
]));
add("認証", "パスワード再設定", screen("Reset", 460, 660, "#ffffff", [
  card(40, 100, 380, 420, [
    txt(40, 40, 300, 30, "パスワード再設定", { fontSize: 22, fontWeight: 800, textAlign: "center" }),
    txt(40, 78, 300, 40, "登録メールに再設定リンクを送ります。", { fontSize: 13, color: "#64748b", textAlign: "center" }),
    ...field(40, 130, 300, "メール", "you@example.com"),
    btn(40, 220, 300, 48, "リンクを送信"),
    link(40, 286, 300, 20, "ログインに戻る", { textAlign: "center", color: "#64748b" }),
  ]),
]));

/* ─────────────── ダッシュボード ─────────────── */
function sidebar(items: string[]): Node {
  return frame(0, 0, 240, 900, { background: "#0f172a" }, [
    txt(24, 28, 200, 26, "● Console", { fontSize: 18, fontWeight: 800, color: "#fff" }),
    ...items.map((it, i) => frame(16, 90 + i * 46, 208, 40, { background: i === 0 ? "rgba(99,102,241,0.25)" : "transparent", borderRadius: 8 }, [txt(16, 10, 180, 20, it, { fontSize: 14, color: i === 0 ? "#fff" : "#94a3b8" })])),
  ]);
}
add("ダッシュボード", "分析（KPI＋グラフ）", screen("Analytics", 1280, 900, "#f1f5f9", [
  sidebar(["ダッシュボード", "売上", "顧客", "レポート", "設定"]),
  txt(272, 32, 400, 32, "ダッシュボード", { fontSize: 26, fontWeight: 800 }),
  ...[0, 1, 2, 3].map((i) => statCard(272 + i * 244, 90, 220, ["売上", "新規顧客", "解約率", "MRR"][i], ["¥4.2M", "1,284", "2.1%", "¥820k"][i], ["#4f46e5", "#10b981", "#ef4444", "#f59e0b"][i])),
  card(272, 220, 600, 360, [txt(24, 20, 400, 24, "売上推移", { fontSize: 16, fontWeight: 700 }), ...[120, 80, 160, 110, 200, 150, 240].map((hh, i) => rect(40 + i * 76, 320 - hh, 48, hh, { background: "#4f46e5", borderRadius: 6 }))]),
  card(896, 220, 360, 360, [txt(24, 20, 300, 24, "チャネル別", { fontSize: 16, fontWeight: 700 }), ...["検索 48%", "SNS 26%", "直接 18%", "広告 8%"].map((s, i) => [txt(24, 70 + i * 60, 200, 18, s, { fontSize: 13, color: "#475569" }), progress(24, 92 + i * 60, 300, 8, [48, 26, 18, 8][i], { background: "#e5e7eb" })]).flat()]),
]));
add("ダッシュボード", "スクロール表（一覧）", screen("Table", 1280, 900, "#f8fafc", [
  sidebar(["概要", "注文", "在庫", "顧客"]),
  txt(272, 32, 400, 32, "注文一覧", { fontSize: 26, fontWeight: 800 }),
  inp(880, 32, 376, 40, "🔍 注文を検索"),
  card(272, 90, 984, 760, [
    frame(0, 0, 984, 48, { background: "#f1f5f9" }, [txt(20, 14, 200, 20, "注文ID", { fontSize: 13, fontWeight: 700, color: "#475569" }), txt(280, 14, 200, 20, "顧客", { fontSize: 13, fontWeight: 700, color: "#475569" }), txt(560, 14, 120, 20, "金額", { fontSize: 13, fontWeight: 700, color: "#475569" }), txt(800, 14, 120, 20, "状態", { fontSize: 13, fontWeight: 700, color: "#475569" })]),
    frame(0, 48, 984, 700, { overflow: "auto" }, Array.from({ length: 16 }).flatMap((_, i) => [
      txt(20, 16 + i * 56, 240, 18, `#10${230 + i}`, { fontSize: 14 }),
      txt(280, 16 + i * 56, 240, 18, ["田中", "佐藤", "鈴木", "高橋"][i % 4] + " 様", { fontSize: 14 }),
      txt(560, 16 + i * 56, 120, 18, `¥${(i + 1) * 1280}`, { fontSize: 14 }),
      badge(800, 12 + i * 56, 90, 26, i % 3 === 0 ? "発送済" : "処理中", { background: i % 3 === 0 ? "#dcfce7" : "#fef9c3", color: i % 3 === 0 ? "#166534" : "#854d0e", fontSize: 12 }),
      divider(20, 52 + i * 56, 944, 1),
    ])),
  ], { shadow: "0 4px 16px rgba(16,24,40,0.05)" }),
]));
add("ダッシュボード", "プロジェクト看板", screen("Board", 1280, 860, "#f1f5f9", [
  txt(40, 30, 400, 32, "スプリント", { fontSize: 26, fontWeight: 800 }),
  ...["未着手", "進行中", "レビュー", "完了"].map((col, c) => frame(40 + c * 304, 90, 280, 720, { background: "#e9edf3", borderRadius: 12 }, [
    txt(16, 14, 200, 20, col, { fontSize: 14, fontWeight: 700, color: "#475569" }),
    ...Array.from({ length: 3 }).map((_, i) => card(12, 48 + i * 110, 256, 96, [txt(16, 14, 220, 18, `タスク ${c + 1}-${i + 1}`, { fontSize: 14, fontWeight: 600 }), txt(16, 40, 220, 30, "短い説明テキスト", { fontSize: 12, color: "#94a3b8" }), avatar(200, 56, 28, 28, "U", { background: "#c7d2fe" })])),
  ])),
]));
add("ダッシュボード", "ウォレット", screen("Wallet", 390, 844, "#0f172a", [
  txt(24, 30, 300, 26, "ウォレット", { fontSize: 22, fontWeight: 800, color: "#fff" }),
  card(24, 80, 342, 180, [rect(0, 0, 342, 180, { background: "linear-gradient(120deg, #4f46e5, #06b6d4)", borderRadius: 16 }), txt(24, 24, 200, 18, "残高", { fontSize: 13, color: "#e0e7ff" }), txt(24, 48, 280, 40, "¥248,500", { fontSize: 34, fontWeight: 800, color: "#fff" }), txt(24, 130, 200, 20, "•••• 4821", { fontSize: 15, color: "#c7d2fe" })]),
  ...["送金", "受取", "チャージ", "履歴"].map((a, i) => frame(24 + i * 86, 284, 76, 80, { background: "#1e293b", borderRadius: 14 }, [icon(24, 14, 28, 30, ["📤", "📥", "➕", "📜"][i], { fontSize: 24 }), txt(0, 50, 76, 18, a, { fontSize: 12, color: "#cbd5e1", textAlign: "center" })])),
  txt(24, 392, 200, 22, "最近の取引", { fontSize: 16, fontWeight: 700, color: "#fff" }),
  ...Array.from({ length: 4 }).flatMap((_, i) => [avatar(24, 430 + i * 64, 40, 40, ["A", "B", "C", "D"][i], { background: "#334155", color: "#fff" }), txt(76, 436 + i * 64, 180, 18, ["Spotify", "Amazon", "給与", "Uber"][i], { fontSize: 15, color: "#fff" }), txt(250, 436 + i * 64, 116, 18, (i === 2 ? "+" : "-") + "¥" + (i + 1) * 1200, { fontSize: 15, color: i === 2 ? "#34d399" : "#f87171", textAlign: "right" })]),
]));
add("ダッシュボード", "ヘルスケア", screen("Health", 390, 844, "#f8fafc", [
  txt(24, 30, 300, 26, "今日の調子", { fontSize: 22, fontWeight: 800 }),
  ...[0, 1].map((i) => card(24 + i * 175, 80, 167, 140, [icon(20, 18, 30, 32, ["👟", "❤️"][i]), txt(20, 64, 130, 20, ["8,420 歩", "72 bpm"][i], { fontSize: 20, fontWeight: 800 }), txt(20, 92, 130, 18, ["目標 10,000", "安静時"][i], { fontSize: 12, color: "#94a3b8" })])),
  card(24, 236, 342, 150, [txt(20, 18, 200, 20, "水分", { fontSize: 15, fontWeight: 700 }), txt(20, 44, 200, 30, "1.4 / 2.0 L", { fontSize: 24, fontWeight: 800, color: "#06b6d4" }), progress(20, 96, 302, 14, 70, { background: "#e0f2fe" })]),
  card(24, 402, 342, 200, [txt(20, 18, 200, 20, "睡眠", { fontSize: 15, fontWeight: 700 }), ...[60, 90, 70, 110, 80, 120, 95].map((hh, i) => rect(24 + i * 44, 170 - hh, 28, hh, { background: "#a855f7", borderRadius: 4 }))]),
]));

/* ─────────────── 料金 ─────────────── */
add("料金", "3プラン", screen("Pricing", 1280, 820, "#ffffff", [
  txt(340, 90, 600, 44, "シンプルな料金プラン", { fontSize: 36, fontWeight: 800, textAlign: "center" }),
  txt(440, 146, 400, 24, "いつでも変更・解約できます", { fontSize: 16, color: "#64748b", textAlign: "center" }),
  ...[0, 1, 2].map((i) => {
    const featured = i === 1;
    return card(190 + i * 320, featured ? 200 : 220, 280, featured ? 460 : 420, [
      ...(featured ? [badge(90, -14, 100, 28, "人気", { background: "#4f46e5", color: "#fff", fontSize: 13 })] : []),
      txt(28, 30, 224, 24, ["Free", "Pro", "Team"][i], { fontSize: 18, fontWeight: 700, color: "#4f46e5" }),
      txt(28, 64, 224, 44, ["¥0", "¥1,800", "¥4,800"][i], { fontSize: 38, fontWeight: 800 }),
      txt(28, 116, 224, 18, "/ 月", { fontSize: 13, color: "#94a3b8" }),
      divider(28, 150, 224, 1),
      list(28, 170, 224, 160, ["メンバー " + ["1", "10", "無制限"][i] + "名", "プロジェクト", "サポート", "分析"]),
      btn(28, featured ? 390 : 350, 224, 46, "選択", featured ? {} : { background: "#eef2ff", color: "#4f46e5" }),
    ], featured ? { border: "2px solid #4f46e5", shadow: "0 20px 50px rgba(79,70,229,0.18)" } : {});
  }),
]));
add("料金", "比較表", screen("Compare", 1100, 760, "#f8fafc", [
  txt(360, 50, 380, 36, "プラン比較", { fontSize: 30, fontWeight: 800, textAlign: "center" }),
  card(80, 120, 940, 580, [
    frame(0, 0, 940, 64, { background: "#0f172a" }, [txt(24, 22, 300, 20, "機能", { fontSize: 14, fontWeight: 700, color: "#fff" }), ...["Free", "Pro", "Team"].map((p, i) => txt(420 + i * 170, 22, 150, 20, p, { fontSize: 14, fontWeight: 700, color: "#fff", textAlign: "center" }))]),
    ...["ストレージ", "メンバー", "API", "SSO", "監査ログ"].map((feat, r) => frame(0, 64 + r * 96, 940, 96, { background: r % 2 ? "#f8fafc" : "#fff" }, [txt(24, 36, 380, 20, feat, { fontSize: 14 }), ...[0, 1, 2].map((c) => txt(420 + c * 170, 36, 150, 20, c >= 2 - (r % 3) ? "✓" : "—", { fontSize: 16, textAlign: "center", color: c >= 2 - (r % 3) ? "#10b981" : "#cbd5e1" }))])),
  ]),
]));
add("料金", "スライダー従量", screen("Usage", 900, 620, "#ffffff", [
  txt(250, 60, 400, 36, "使った分だけ", { fontSize: 30, fontWeight: 800, textAlign: "center" }),
  card(150, 150, 600, 360, [
    txt(40, 36, 300, 22, "月間アクティブユーザー", { fontSize: 15, color: "#475569" }),
    txt(40, 64, 300, 40, "50,000", { fontSize: 34, fontWeight: 800 }),
    progress(40, 130, 520, 12, 55, { background: "#e5e7eb" }),
    divider(40, 180, 520, 1),
    txt(40, 210, 300, 22, "推定料金", { fontSize: 15, color: "#475569" }),
    txt(40, 238, 300, 44, "¥24,000 / 月", { fontSize: 32, fontWeight: 800, color: "#4f46e5" }),
    btn(40, 300, 520, 50, "このプランで始める"),
  ]),
]));
add("料金", "FAQ付き", screen("Pricing FAQ", 900, 860, "#f8fafc", [
  txt(300, 50, 300, 34, "料金とFAQ", { fontSize: 28, fontWeight: 800, textAlign: "center" }),
  ...[0, 1].map((i) => card(80 + i * 380, 120, 360, 220, [txt(28, 28, 300, 24, ["スターター", "ビジネス"][i], { fontSize: 18, fontWeight: 700 }), txt(28, 60, 300, 40, ["¥980", "¥3,980"][i], { fontSize: 34, fontWeight: 800 }), btn(28, 150, 304, 46, "選ぶ")])),
  ...["無料プランはありますか？", "支払い方法は？", "解約はできますか？"].map((q, i) => node("Accordion", 80, 380 + i * 76, 740, 60, { props: { title: q, body: "回答テキストがここに入ります。" }, style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 } })),
]));
add("料金", "単価カード", screen("Single Plan", 460, 720, "#eef2ff", [
  card(40, 100, 380, 520, [
    badge(140, 30, 100, 28, "おすすめ", { background: "#eef2ff", color: "#4f46e5", fontSize: 13 }),
    txt(40, 80, 300, 28, "Pro プラン", { fontSize: 22, fontWeight: 800, textAlign: "center" }),
    txt(40, 120, 300, 50, "¥1,800", { fontSize: 44, fontWeight: 800, textAlign: "center", color: "#4f46e5" }),
    txt(40, 174, 300, 20, "月額・税込", { fontSize: 13, color: "#94a3b8", textAlign: "center" }),
    divider(40, 210, 300, 1),
    list(56, 230, 290, 180, ["全機能アンロック", "優先サポート", "チーム共有", "詳細分析", "API アクセス"]),
    btn(40, 440, 300, 50, "14日間無料で試す"),
  ]),
]));

/* ─────────────── プロフィール ─────────────── */
add("プロフィール", "ユーザー（カバー）", screen("Profile", 900, 760, "#f8fafc", [
  card(60, 40, 780, 660, [
    rect(0, 0, 780, 180, { background: "linear-gradient(120deg, #4f46e5, #ec4899)", borderRadius: 16 }),
    avatar(40, 120, 120, 120, "Y", { background: "#fff", color: "#4f46e5", fontWeight: 800, border: "4px solid #fff" }),
    txt(180, 196, 400, 30, "山田 太郎", { fontSize: 24, fontWeight: 800 }),
    txt(180, 230, 400, 22, "プロダクトデザイナー @ Nova", { fontSize: 15, color: "#64748b" }),
    btn(600, 200, 140, 44, "フォロー"),
    divider(40, 280, 700, 1),
    ...[0, 1, 2].map((i) => frame(40 + i * 234, 300, 220, 90, {}, [txt(0, 6, 220, 30, ["1,284", "342", "98"][i], { fontSize: 26, fontWeight: 800, textAlign: "center" }), txt(0, 44, 220, 20, ["フォロワー", "フォロー中", "投稿"][i], { fontSize: 13, color: "#94a3b8", textAlign: "center" })])),
    txt(40, 410, 700, 80, "プロフィールの自己紹介テキスト。経歴や興味をここに記述します。", { fontSize: 15, color: "#334155", lineHeight: 1.7 }),
  ]),
]));
add("プロフィール", "設定（アカウント）", screen("Account", 900, 800, "#ffffff", [
  txt(60, 40, 400, 32, "アカウント設定", { fontSize: 26, fontWeight: 800 }),
  card(60, 100, 780, 640, [
    txt(32, 28, 300, 22, "プロフィール", { fontSize: 16, fontWeight: 700 }),
    avatar(32, 64, 72, 72, "Y", { background: "#4f46e5", color: "#fff" }),
    btn(120, 84, 120, 40, "写真を変更", { background: "#eef2ff", color: "#4f46e5" }),
    ...field(32, 160, 340, "表示名", "山田 太郎"),
    ...field(396, 160, 340, "ユーザー名", "@taro"),
    ...field(32, 246, 704, "自己紹介", "短い紹介文"),
    divider(32, 336, 704, 1),
    txt(32, 360, 400, 20, "通知", { fontSize: 16, fontWeight: 700 }),
    ...["メール通知", "プッシュ通知", "週次レポート"].map((s, i) => [txt(32, 404 + i * 50, 400, 20, s, { fontSize: 14, color: "#334155" }), node("Switch", 680, 400 + i * 50, 56, 28, { props: { label: "", checked: i !== 1 } })]).flat(),
    btn(32, 560, 200, 46, "変更を保存"),
  ]),
]));
add("プロフィール", "チームメンバー", screen("Team", 900, 760, "#f8fafc", [
  txt(60, 40, 400, 32, "チーム", { fontSize: 26, fontWeight: 800 }),
  btn(700, 44, 140, 44, "+ 招待"),
  card(60, 100, 780, 620, Array.from({ length: 7 }).flatMap((_, i) => [
    avatar(28, 24 + i * 80, 48, 48, ["A", "B", "C", "D", "E", "F", "G"][i], { background: ["#4f46e5", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#ef4444"][i], color: "#fff" }),
    txt(92, 30 + i * 80, 300, 20, ["田中 花子", "佐藤 次郎", "鈴木 三郎", "高橋 美咲", "伊藤 健", "渡辺 彩", "山本 大"][i], { fontSize: 16, fontWeight: 600 }),
    txt(92, 54 + i * 80, 300, 18, ["管理者", "編集者", "閲覧者"][i % 3] + " · member@team.com", { fontSize: 13, color: "#94a3b8" }),
    badge(620, 36 + i * 80, 100, 26, ["管理者", "編集者", "閲覧者"][i % 3], { background: "#eef2ff", color: "#4f46e5", fontSize: 12 }),
    divider(28, 76 + i * 80, 724, 1),
  ])),
]));
add("プロフィール", "モバイル名刺", screen("Card", 390, 844, "#0f172a", [
  rect(0, 0, 390, 320, { background: "linear-gradient(135deg, #4f46e5, #06b6d4)" }),
  avatar(135, 130, 120, 120, "Y", { background: "#fff", color: "#4f46e5", fontWeight: 800, border: "5px solid rgba(255,255,255,0.3)" }),
  txt(45, 270, 300, 30, "山田 太郎", { fontSize: 26, fontWeight: 800, color: "#fff", textAlign: "center" }),
  txt(45, 308, 300, 22, "Freelance Designer", { fontSize: 15, color: "#c7d2fe", textAlign: "center" }),
  ...["✉️ mail@example.com", "📍 東京, 日本", "🔗 example.com"].map((s, i) => card(24, 380 + i * 76, 342, 60, [txt(20, 18, 300, 22, s, { fontSize: 15, color: "#e2e8f0" })], { background: "#1e293b", border: "none", shadow: "none" })),
  btn(24, 640, 342, 52, "連絡先を保存"),
]));
add("プロフィール", "実績ギャラリー", screen("Portfolio", 1100, 800, "#ffffff", [
  txt(60, 40, 400, 32, "作品集", { fontSize: 26, fontWeight: 800 }),
  ...Array.from({ length: 6 }).map((_, i) => card(60 + (i % 3) * 330, 100 + Math.floor(i / 3) * 330, 310, 310, [
    rect(0, 0, 310, 200, { background: ["#c7d2fe", "#bbf7d0", "#fed7aa", "#fbcfe8", "#bae6fd", "#ddd6fe"][i], borderRadius: 16 }),
    txt(20, 216, 270, 22, `プロジェクト ${i + 1}`, { fontSize: 17, fontWeight: 700 }),
    txt(20, 246, 270, 20, "Webデザイン · 2025", { fontSize: 13, color: "#94a3b8" }),
  ])),
]));

/* ─────────────── EC（商品） ─────────────── */
add("EC", "商品詳細", screen("Product", 1200, 820, "#ffffff", [
  navbar(1200, "Shop", ["新着", "メンズ", "レディース", "セール"]),
  card(80, 110, 480, 480, [rect(40, 40, 400, 400, { background: "#f1f5f9", borderRadius: 12 }), icon(200, 200, 80, 80, "👟", { fontSize: 80 })], { shadow: "none", border: "none", background: "#f8fafc" }),
  txt(620, 130, 500, 30, "スニーカー Air Flow", { fontSize: 26, fontWeight: 800 }),
  txt(620, 168, 200, 22, "★★★★☆ (128件)", { fontSize: 14, color: "#f59e0b" }),
  txt(620, 210, 300, 40, "¥12,800", { fontSize: 34, fontWeight: 800, color: "#4f46e5" }),
  txt(620, 270, 480, 70, "軽量で通気性に優れたデイリースニーカー。どんな服装にも合わせやすい定番モデル。", { fontSize: 15, color: "#475569", lineHeight: 1.7 }),
  txt(620, 360, 200, 20, "サイズ", { fontSize: 14, fontWeight: 700 }),
  ...["25", "26", "27", "28"].map((s, i) => frame(620 + i * 64, 388, 52, 52, { background: i === 1 ? "#4f46e5" : "#fff", border: "1px solid #d1d5db", borderRadius: 8 }, [txt(0, 16, 52, 20, s, { fontSize: 14, color: i === 1 ? "#fff" : "#111827", textAlign: "center" })])),
  btn(620, 470, 320, 54, "カートに入れる"),
  btn(956, 470, 150, 54, "♡ お気に入り", { background: "#fff", color: "#111827", border: "1px solid #d1d5db" }),
]));
add("EC", "商品グリッド", screen("Catalog", 1200, 880, "#f8fafc", [
  navbar(1200, "Shop", ["すべて", "新着", "人気", "セール"]),
  txt(80, 100, 300, 30, "新着アイテム", { fontSize: 24, fontWeight: 800 }),
  ...Array.from({ length: 8 }).map((_, i) => card(80 + (i % 4) * 270, 150 + Math.floor(i / 4) * 340, 250, 320, [
    rect(0, 0, 250, 200, { background: ["#dbeafe", "#dcfce7", "#fef3c7", "#fce7f3"][i % 4], borderRadius: 12 }),
    badge(12, 12, 60, 24, "NEW", { background: "#4f46e5", color: "#fff", fontSize: 11 }),
    txt(16, 214, 218, 22, `アイテム ${i + 1}`, { fontSize: 15, fontWeight: 700 }),
    txt(16, 242, 150, 22, `¥${(i + 3) * 1200}`, { fontSize: 18, fontWeight: 800, color: "#4f46e5" }),
    btn(160, 244, 74, 36, "追加", { fontSize: 13 }),
  ])),
]));
add("EC", "カート", screen("Cart", 1100, 760, "#ffffff", [
  txt(80, 40, 300, 32, "カート (3)", { fontSize: 26, fontWeight: 800 }),
  card(80, 100, 640, 560, Array.from({ length: 3 }).flatMap((_, i) => [
    rect(24, 24 + i * 150, 100, 100, { background: ["#dbeafe", "#dcfce7", "#fef3c7"][i], borderRadius: 12 }),
    txt(144, 36 + i * 150, 300, 22, `商品 ${i + 1}`, { fontSize: 16, fontWeight: 700 }),
    txt(144, 66 + i * 150, 300, 18, "サイズ M · ブルー", { fontSize: 13, color: "#94a3b8" }),
    txt(144, 92 + i * 150, 200, 22, `¥${(i + 2) * 2400}`, { fontSize: 18, fontWeight: 800, color: "#4f46e5" }),
    divider(24, 142 + i * 150, 592, 1),
  ])),
  card(740, 100, 280, 380, [
    txt(24, 24, 200, 22, "ご注文サマリー", { fontSize: 16, fontWeight: 700 }),
    ...["小計", "送料", "合計"].map((s, i) => [txt(24, 70 + i * 44, 120, 20, s, { fontSize: 14, color: "#475569" }), txt(140, 70 + i * 44, 116, 20, ["¥14,400", "¥600", "¥15,000"][i], { fontSize: i === 2 ? 18 : 14, fontWeight: i === 2 ? 800 : 400, textAlign: "right" })]).flat(),
    btn(24, 230, 232, 52, "レジに進む"),
  ]),
]));
add("EC", "チェックアウト", screen("Checkout", 1100, 820, "#f8fafc", [
  txt(80, 40, 300, 32, "お支払い", { fontSize: 26, fontWeight: 800 }),
  card(80, 100, 600, 660, [
    txt(28, 28, 300, 22, "配送先", { fontSize: 16, fontWeight: 700 }),
    ...field(28, 64, 540, "氏名", "山田 太郎"),
    ...field(28, 150, 540, "住所", "東京都..."),
    divider(28, 240, 540, 1),
    txt(28, 264, 300, 22, "カード情報", { fontSize: 16, fontWeight: 700 }),
    ...field(28, 300, 540, "カード番号", "1234 5678 9012 3456"),
    ...field(28, 386, 260, "有効期限", "MM/YY"),
    ...field(308, 386, 260, "CVC", "123"),
    btn(28, 480, 540, 54, "¥15,000 を支払う"),
  ]),
  card(700, 100, 320, 300, [txt(24, 24, 200, 20, "注文内容", { fontSize: 15, fontWeight: 700 }), ...["商品 ×3", "送料", "合計"].map((s, i) => [txt(24, 64 + i * 44, 150, 18, s, { fontSize: 14, color: "#475569" }), txt(180, 64 + i * 44, 116, 18, ["¥14,400", "¥600", "¥15,000"][i], { fontSize: 14, textAlign: "right", fontWeight: i === 2 ? 800 : 400 })]).flat()]),
]));
add("EC", "モバイル商品", screen("Mobile Product", 390, 844, "#ffffff", [
  rect(0, 0, 390, 360, { background: "#f1f5f9" }),
  icon(155, 130, 80, 80, "🎧", { fontSize: 80 }),
  frame(16, 16, 44, 44, { background: "rgba(255,255,255,0.8)", borderRadius: 999 }, [icon(10, 8, 24, 28, "‹", { fontSize: 26 })]),
  txt(24, 384, 342, 28, "ワイヤレスヘッドホン", { fontSize: 22, fontWeight: 800 }),
  txt(24, 420, 200, 22, "★★★★★ 4.9", { fontSize: 14, color: "#f59e0b" }),
  txt(24, 456, 200, 36, "¥24,800", { fontSize: 28, fontWeight: 800, color: "#4f46e5" }),
  txt(24, 510, 342, 80, "ノイズキャンセリング搭載。最大30時間再生のロングバッテリー。", { fontSize: 14, color: "#475569", lineHeight: 1.7 }),
  divider(0, 740, 390, 1),
  btn(24, 768, 250, 56, "カートに追加"),
  frame(290, 768, 76, 56, { background: "#eef2ff", borderRadius: 12 }, [icon(26, 14, 24, 28, "♡")]),
]));

/* ─────────────── 地図/位置 ─────────────── */
add("地図", "店舗検索", screen("Map Search", 1200, 820, "#ffffff", [
  embed(360, 0, 840, 820, MAP, { borderRadius: 0, border: "none" }),
  frame(0, 0, 360, 820, { background: "#fff", shadow: "8px 0 24px rgba(0,0,0,0.06)" }, [
    txt(24, 28, 300, 26, "近くの店舗", { fontSize: 20, fontWeight: 800 }),
    inp(24, 70, 312, 44, "🔍 エリアで検索"),
    ...Array.from({ length: 5 }).flatMap((_, i) => [
      txt(24, 140 + i * 120, 300, 22, `${["渋谷", "新宿", "原宿", "表参道", "恵比寿"][i]}店`, { fontSize: 16, fontWeight: 700 }),
      txt(24, 168 + i * 120, 300, 18, "★4." + (9 - i) + " · 営業中 · 0.4km", { fontSize: 13, color: "#64748b" }),
      txt(24, 192 + i * 120, 300, 18, "東京都〇〇区△△ 1-2-3", { fontSize: 13, color: "#94a3b8" }),
      divider(24, 232 + i * 120, 312, 1),
    ]),
  ]),
]));
add("地図", "配達トラッキング", screen("Delivery", 390, 844, "#ffffff", [
  embed(0, 0, 390, 460, MAP, { borderRadius: 0, border: "none" }),
  card(16, 420, 358, 400, [
    rect(160, 16, 40, 4, { background: "#e5e7eb", borderRadius: 999 }),
    txt(24, 40, 300, 24, "配達中です", { fontSize: 20, fontWeight: 800 }),
    txt(24, 72, 300, 20, "あと約 12 分で到着", { fontSize: 14, color: "#10b981" }),
    progress(24, 110, 310, 10, 65, { background: "#e5e7eb" }),
    divider(24, 146, 310, 1),
    avatar(24, 170, 56, 56, "🛵", { background: "#eef2ff", fontSize: 24 }),
    txt(96, 178, 240, 20, "配達員 田中さん", { fontSize: 16, fontWeight: 700 }),
    txt(96, 204, 240, 18, "★4.95 · トヨタ", { fontSize: 13, color: "#94a3b8" }),
    btn(24, 250, 150, 50, "📞 電話"),
    btn(184, 250, 150, 50, "💬 チャット", { background: "#eef2ff", color: "#4f46e5" }),
  ]),
]));
add("地図", "イベント詳細", screen("Event", 900, 820, "#ffffff", [
  rect(0, 0, 900, 240, { background: "linear-gradient(120deg, #4f46e5, #ec4899)" }),
  txt(60, 90, 600, 40, "デザインカンファレンス 2025", { fontSize: 32, fontWeight: 800, color: "#fff" }),
  txt(60, 144, 400, 24, "📅 6月20日 · 📍 東京国際フォーラム", { fontSize: 16, color: "#e0e7ff" }),
  card(60, 290, 480, 470, [txt(28, 24, 400, 24, "概要", { fontSize: 18, fontWeight: 700 }), txt(28, 60, 420, 160, "業界をリードするスピーカーが集結。最新のデザイントレンドとツールについて学べる一日。", { fontSize: 15, color: "#475569", lineHeight: 1.8 }), divider(28, 230, 420, 1), txt(28, 254, 400, 22, "登壇者", { fontSize: 16, fontWeight: 700 }), ...Array.from({ length: 3 }).map((_, i) => avatar(28 + i * 64, 290, 52, 52, ["A", "B", "C"][i], { background: ["#4f46e5", "#10b981", "#f59e0b"][i], color: "#fff" }))]),
  card(564, 290, 276, 200, [txt(24, 20, 200, 20, "会場", { fontSize: 15, fontWeight: 700 })], { background: "#f8fafc" }),
  embed(588, 330, 228, 140, MAP),
  btn(564, 510, 276, 54, "チケットを購入"),
]));
add("地図", "天気", screen("Weather", 390, 844, "#1e3a8a", [
  rect(0, 0, 390, 844, { background: "linear-gradient(180deg, #1e3a8a, #3b82f6)" }),
  txt(24, 60, 300, 24, "東京", { fontSize: 22, fontWeight: 700, color: "#fff" }),
  icon(150, 110, 90, 90, "⛅", { fontSize: 90 }),
  txt(95, 210, 200, 70, "23°", { fontSize: 72, fontWeight: 200, color: "#fff", textAlign: "center" }),
  txt(95, 290, 200, 24, "晴れ時々くもり", { fontSize: 16, color: "#bfdbfe", textAlign: "center" }),
  card(24, 360, 342, 120, ["最高 26°", "最低 18°", "湿度 60%"].map((s, i) => txt(20 + i * 110, 44, 110, 22, s, { fontSize: 15, color: "#fff", textAlign: "center" })), { background: "rgba(255,255,255,0.12)", border: "none", shadow: "none" }),
  card(24, 500, 342, 220, [txt(20, 18, 200, 20, "週間予報", { fontSize: 15, fontWeight: 700, color: "#fff" }), ...["月", "火", "水", "木", "金"].map((d, i) => [txt(20, 56 + i * 32, 60, 18, d, { fontSize: 14, color: "#dbeafe" }), icon(120, 50 + i * 32, 24, 24, ["☀️", "⛅", "🌧", "☁️", "☀️"][i], { fontSize: 18 }), txt(250, 56 + i * 32, 72, 18, `${24 - i}° / ${17 - i}°`, { fontSize: 14, color: "#fff", textAlign: "right" })]).flat()], { background: "rgba(255,255,255,0.12)", border: "none", shadow: "none" }),
]));
add("地図", "予約（2分割）", screen("Booking", 1100, 760, "#ffffff", [
  frame(0, 0, 550, 760, { background: "#f8fafc" }, [
    txt(40, 40, 400, 30, "席を予約", { fontSize: 24, fontWeight: 800 }),
    ...field(40, 100, 470, "お名前", "山田 太郎"),
    ...field(40, 186, 230, "日付", "2025/06/20"),
    ...field(296, 186, 214, "時間", "19:00"),
    ...field(40, 272, 470, "人数", "2名"),
    btn(40, 360, 470, 54, "予約を確定"),
  ]),
  divider(550, 0, 1, 760, { background: "#e5e7eb" }),
  embed(580, 40, 480, 380, MAP),
  txt(580, 440, 480, 24, "📍 レストラン Nova", { fontSize: 18, fontWeight: 700 }),
  txt(580, 472, 480, 20, "東京都港区〇〇 2-3-4 · 03-1234-5678", { fontSize: 14, color: "#64748b" }),
]));

/* ─────────────── チャット ─────────────── */
add("チャット", "メッセージ", screen("Messenger", 1100, 800, "#ffffff", [
  frame(0, 0, 340, 800, { background: "#f8fafc", border: "1px solid #eef0f4" }, [
    txt(24, 24, 200, 26, "チャット", { fontSize: 20, fontWeight: 800 }),
    inp(24, 64, 292, 40, "🔍 検索"),
    ...Array.from({ length: 6 }).flatMap((_, i) => [
      avatar(24, 130 + i * 80, 48, 48, ["A", "B", "C", "D", "E", "F"][i], { background: ["#4f46e5", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"][i], color: "#fff" }),
      txt(84, 136 + i * 80, 200, 20, ["田中", "佐藤", "鈴木", "高橋", "伊藤", "渡辺"][i] + " さん", { fontSize: 15, fontWeight: 600 }),
      txt(84, 160 + i * 80, 200, 18, "最後のメッセージ…", { fontSize: 13, color: "#94a3b8" }),
    ]),
  ]),
  frame(340, 0, 760, 72, { background: "#fff", border: "1px solid #eef0f4" }, [avatar(20, 12, 48, 48, "A", { background: "#4f46e5", color: "#fff" }), txt(80, 22, 300, 24, "田中 花子", { fontSize: 17, fontWeight: 700 })]),
  ...[{ me: false, t: "こんにちは！", y: 110 }, { me: true, t: "お疲れさまです", y: 170 }, { me: false, t: "例の件、進捗どうですか？", y: 230 }, { me: true, t: "順調です！明日には共有できます", y: 290 }].map((m) => frame(m.me ? 740 : 380, m.y, 320, 44, { background: m.me ? "#4f46e5" : "#f1f5f9", borderRadius: 16 }, [txt(16, 11, 290, 22, m.t, { fontSize: 14, color: m.me ? "#fff" : "#111827" })])),
  inp(380, 720, 580, 50, "メッセージを入力…"),
  btn(976, 720, 100, 50, "送信"),
]));
add("チャット", "AIアシスタント", screen("AI Chat", 800, 820, "#ffffff", [
  frame(0, 0, 800, 70, { background: "#fff", border: "1px solid #eef0f4" }, [avatar(20, 11, 48, 48, "🤖", { background: "#eef2ff", fontSize: 22 }), txt(80, 22, 300, 24, "AI アシスタント", { fontSize: 17, fontWeight: 700 })]),
  frame(0, 70, 800, 660, { overflow: "auto", background: "#f8fafc" }, [
    ...[{ me: false, t: "何かお手伝いできることはありますか？" }, { me: true, t: "プレゼン資料を作りたいです" }, { me: false, t: "承知しました。テーマと枚数を教えてください。構成案からご提案します。" }].map((m, i) => frame(m.me ? 360 : 24, 24 + i * 90, 416, 70, { background: m.me ? "#4f46e5" : "#fff", borderRadius: 14, border: m.me ? "none" : "1px solid #eef0f4" }, [txt(16, 14, 386, 44, m.t, { fontSize: 14, color: m.me ? "#fff" : "#111827", lineHeight: 1.6 })])),
  ]),
  inp(24, 752, 660, 52, "メッセージを送る…"),
  btn(700, 752, 76, 52, "↑"),
]));
add("チャット", "コメントスレッド", screen("Comments", 720, 800, "#ffffff", [
  txt(40, 32, 300, 28, "コメント (12)", { fontSize: 22, fontWeight: 800 }),
  frame(0, 80, 720, 620, { overflow: "auto" }, Array.from({ length: 6 }).flatMap((_, i) => [
    avatar(40, 24 + i * 110, 44, 44, ["A", "B", "C", "D", "E", "F"][i], { background: ["#4f46e5", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"][i], color: "#fff" }),
    txt(100, 28 + i * 110, 300, 18, ["田中", "佐藤", "鈴木", "高橋", "伊藤", "渡辺"][i], { fontSize: 14, fontWeight: 700 }),
    txt(100, 50 + i * 110, 560, 40, "なるほど、ここの余白をもう少し広げると読みやすそうですね。", { fontSize: 14, color: "#334155", lineHeight: 1.6 }),
    txt(100, 90 + i * 110, 200, 16, "返信 · いいね 3", { fontSize: 12, color: "#94a3b8" }),
  ])),
  inp(40, 728, 540, 48, "コメントを追加…"),
  btn(596, 728, 84, 48, "投稿"),
]));
add("チャット", "サポートチケット", screen("Support", 900, 760, "#f8fafc", [
  txt(40, 32, 400, 30, "サポート", { fontSize: 26, fontWeight: 800 }),
  card(40, 90, 540, 620, Array.from({ length: 5 }).flatMap((_, i) => [
    badge(24, 28 + i * 116, 70, 24, ["未対応", "対応中", "解決済"][i % 3], { background: ["#fee2e2", "#fef9c3", "#dcfce7"][i % 3], color: ["#991b1b", "#854d0e", "#166534"][i % 3], fontSize: 11 }),
    txt(108, 26 + i * 116, 300, 20, `#${100 + i} ログインできない`, { fontSize: 15, fontWeight: 700 }),
    txt(24, 56 + i * 116, 480, 36, "問い合わせ内容の冒頭テキストがここに表示されます…", { fontSize: 13, color: "#64748b" }),
    divider(24, 104 + i * 116, 492, 1),
  ])),
  card(600, 90, 260, 300, [txt(24, 24, 200, 20, "ステータス", { fontSize: 15, fontWeight: 700 }), ...["未対応 4", "対応中 7", "解決済 132"].map((s, i) => [txt(24, 64 + i * 50, 150, 18, s.split(" ")[0], { fontSize: 14, color: "#475569" }), txt(180, 64 + i * 50, 56, 18, s.split(" ")[1], { fontSize: 14, fontWeight: 700, textAlign: "right" })]).flat()]),
]));
add("チャット", "通知センター", screen("Notifications", 460, 820, "#ffffff", [
  txt(24, 32, 300, 28, "通知", { fontSize: 24, fontWeight: 800 }),
  link(360, 40, 80, 20, "全て既読", { textAlign: "right" }),
  ...Array.from({ length: 7 }).flatMap((_, i) => [
    frame(0, 90 + i * 96, 460, 96, { background: i < 2 ? "#eef2ff" : "#fff" }, [
      avatar(20, 22, 44, 44, ["❤️", "💬", "👤", "🔔", "⭐", "📦", "✅"][i], { background: "#f1f5f9", fontSize: 20 }),
      txt(80, 22, 340, 36, ["いいねしました", "コメントしました", "フォローしました", "リマインダー", "お気に入り追加", "発送しました", "完了しました"][i], { fontSize: 14, color: "#111827", lineHeight: 1.5 }),
      txt(80, 60, 200, 16, `${i + 1}時間前`, { fontSize: 12, color: "#94a3b8" }),
    ]),
    divider(20, 186 + i * 96, 420, 1),
  ]),
]));

/* ─────────────── 設定/その他 ─────────────── */
add("設定", "一般設定", screen("Settings", 900, 800, "#f8fafc", [
  frame(0, 0, 240, 800, { background: "#fff", border: "1px solid #eef0f4" }, [txt(24, 28, 200, 22, "設定", { fontSize: 18, fontWeight: 800 }), ...["一般", "アカウント", "通知", "プライバシー", "請求"].map((s, i) => frame(12, 80 + i * 46, 216, 40, { background: i === 0 ? "#eef2ff" : "transparent", borderRadius: 8 }, [txt(16, 10, 180, 20, s, { fontSize: 14, color: i === 0 ? "#4f46e5" : "#475569", fontWeight: i === 0 ? 700 : 400 })]))]),
  txt(280, 40, 400, 30, "一般", { fontSize: 24, fontWeight: 800 }),
  card(280, 96, 580, 620, [
    ...["ダークモード", "自動保存", "ベータ機能", "使用状況の共有"].map((s, i) => [txt(28, 36 + i * 70, 400, 20, s, { fontSize: 15, fontWeight: 600 }), txt(28, 60 + i * 70, 400, 18, "この設定の説明テキスト", { fontSize: 12, color: "#94a3b8" }), node("Switch", 480, 40 + i * 70, 56, 28, { props: { label: "", checked: i % 2 === 0 } }), divider(28, 92 + i * 70, 524, 1)]).flat(),
    txt(28, 330, 200, 20, "言語", { fontSize: 15, fontWeight: 600 }),
    node("Select", 28, 360, 524, 46, { props: { options: ["日本語", "English", "中文"] }, style: { border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, background: "#fff" } }),
  ]),
]));
add("設定", "オンボーディング", screen("Onboarding", 390, 844, "#ffffff", [
  rect(0, 0, 390, 460, { background: "linear-gradient(135deg, #eef2ff, #fce7f3)" }),
  icon(145, 150, 100, 100, "🎉", { fontSize: 100 }),
  txt(40, 500, 310, 60, "Drafter へようこそ", { fontSize: 28, fontWeight: 800, textAlign: "center" }),
  txt(40, 570, 310, 60, "1画面のデザインを、思いのままに。さあ、始めましょう。", { fontSize: 15, color: "#64748b", textAlign: "center", lineHeight: 1.7 }),
  ...[0, 1, 2].map((i) => rect(155 + i * 28, 660, i === 0 ? 24 : 8, 8, { background: i === 0 ? "#4f46e5" : "#cbd5e1", borderRadius: 999 })),
  btn(40, 710, 310, 54, "次へ"),
  link(40, 778, 310, 20, "スキップ", { textAlign: "center", color: "#94a3b8" }),
]));
add("設定", "空状態", screen("Empty", 800, 600, "#ffffff", [
  icon(360, 150, 90, 90, "📭", { fontSize: 80 }),
  txt(200, 270, 400, 30, "まだ何もありません", { fontSize: 24, fontWeight: 800, textAlign: "center" }),
  txt(200, 314, 400, 50, "最初のプロジェクトを作成して始めましょう。", { fontSize: 15, color: "#64748b", textAlign: "center" }),
  btn(330, 390, 140, 50, "+ 作成する"),
]));
add("設定", "404エラー", screen("404", 900, 600, "#0f172a", [
  rect(0, 0, 900, 600, { background: "linear-gradient(135deg, #0f172a, #1e293b)" }),
  txt(150, 160, 600, 120, "404", { fontSize: 120, fontWeight: 800, color: "#4f46e5", textAlign: "center" }),
  txt(250, 300, 400, 30, "ページが見つかりません", { fontSize: 24, fontWeight: 700, color: "#fff", textAlign: "center" }),
  txt(250, 344, 400, 24, "お探しのページは移動または削除された可能性があります。", { fontSize: 14, color: "#94a3b8", textAlign: "center" }),
  btn(370, 410, 160, 50, "ホームに戻る"),
]));
add("設定", "ファイルアップロード", screen("Upload", 700, 560, "#ffffff", [
  txt(40, 36, 300, 28, "ファイルを追加", { fontSize: 22, fontWeight: 800 }),
  frame(40, 90, 620, 280, { background: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: 16 }, [
    icon(280, 60, 60, 60, "☁️", { fontSize: 56 }),
    txt(110, 150, 400, 26, "ここにドラッグ＆ドロップ", { fontSize: 18, fontWeight: 700, textAlign: "center" }),
    txt(110, 184, 400, 20, "または", { fontSize: 13, color: "#94a3b8", textAlign: "center" }),
    btn(270, 212, 140, 44, "ファイルを選択"),
  ]),
  card(40, 400, 620, 110, [rect(20, 24, 44, 44, { background: "#eef2ff", borderRadius: 8 }), txt(80, 28, 300, 18, "report.pdf", { fontSize: 14, fontWeight: 600 }), txt(80, 50, 300, 16, "2.4 MB · アップロード中", { fontSize: 12, color: "#94a3b8" }), progress(80, 76, 480, 8, 70, { background: "#e5e7eb" })]),
]));

/* ─────────────── メディア ─────────────── */
add("メディア", "音楽プレイヤー", screen("Music", 390, 844, "#1e1b4b", [
  rect(0, 0, 390, 844, { background: "linear-gradient(180deg, #312e81, #1e1b4b)" }),
  txt(24, 50, 342, 20, "再生中", { fontSize: 13, color: "#a5b4fc", textAlign: "center" }),
  card(65, 110, 260, 260, [rect(0, 0, 260, 260, { background: "linear-gradient(135deg, #8b5cf6, #ec4899)", borderRadius: 20 }), icon(100, 100, 60, 60, "🎵", { fontSize: 56 })], { background: "transparent", border: "none", shadow: "0 20px 50px rgba(139,92,246,0.4)" }),
  txt(24, 400, 342, 30, "Midnight City", { fontSize: 24, fontWeight: 800, color: "#fff", textAlign: "center" }),
  txt(24, 436, 342, 22, "M83", { fontSize: 15, color: "#a5b4fc", textAlign: "center" }),
  progress(40, 500, 310, 6, 40, { background: "rgba(255,255,255,0.2)" }),
  txt(40, 516, 100, 16, "1:42", { fontSize: 11, color: "#a5b4fc" }),
  txt(250, 516, 100, 16, "4:03", { fontSize: 11, color: "#a5b4fc", textAlign: "right" }),
  ...["⏮", "▶️", "⏭"].map((s, i) => icon(110 + i * 80, 560, i === 1 ? 60 : 44, 60, s, { fontSize: i === 1 ? 44 : 30 })),
]));
add("メディア", "動画詳細", screen("Video", 1100, 800, "#ffffff", [
  embed(40, 40, 720, 405, YT, { border: "none" }),
  txt(40, 470, 720, 30, "Drafterの使い方 完全ガイド", { fontSize: 22, fontWeight: 800 }),
  txt(40, 510, 400, 20, "12万回視聴 · 3日前", { fontSize: 13, color: "#94a3b8" }),
  divider(40, 544, 720, 1),
  avatar(40, 564, 48, 48, "C", { background: "#4f46e5", color: "#fff" }),
  txt(100, 568, 300, 20, "Drafter公式", { fontSize: 15, fontWeight: 700 }),
  txt(100, 592, 300, 18, "登録者 4.2万人", { fontSize: 12, color: "#94a3b8" }),
  btn(620, 568, 140, 44, "チャンネル登録", { background: "#ef4444" }),
  txt(800, 40, 260, 24, "次の動画", { fontSize: 16, fontWeight: 700 }),
  ...Array.from({ length: 4 }).map((_, i) => frame(800, 80 + i * 110, 260, 96, {}, [rect(0, 0, 150, 90, { background: "#e2e8f0", borderRadius: 8 }), txt(162, 4, 98, 50, `関連動画 ${i + 1}`, { fontSize: 13, fontWeight: 600, lineHeight: 1.4 }), txt(162, 60, 98, 16, "2.1万回", { fontSize: 11, color: "#94a3b8" })])),
]));
add("メディア", "ギャラリー（スクロール）", screen("Gallery", 900, 760, "#0f172a", [
  txt(40, 32, 300, 30, "ギャラリー", { fontSize: 26, fontWeight: 800, color: "#fff" }),
  frame(40, 90, 820, 630, { overflow: "auto", borderRadius: 16 }, Array.from({ length: 12 }).map((_, i) => rect((i % 3) * 274, Math.floor(i / 3) * 224, 260, 210, { background: ["#4f46e5", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6"][i % 6], borderRadius: 12 }))),
]));
add("メディア", "ポッドキャスト", screen("Podcast", 390, 844, "#ffffff", [
  rect(0, 0, 390, 300, { background: "linear-gradient(135deg, #f59e0b, #ef4444)" }),
  card(115, 120, 160, 160, [rect(0, 0, 160, 160, { background: "#fff", borderRadius: 20 }), icon(56, 50, 48, 56, "🎙", { fontSize: 48 })], { background: "transparent", border: "none", shadow: "0 14px 40px rgba(0,0,0,0.25)" }),
  txt(24, 320, 342, 28, "テックトーク Ep.42", { fontSize: 22, fontWeight: 800, textAlign: "center" }),
  txt(24, 354, 342, 22, "AIとデザインの未来", { fontSize: 14, color: "#94a3b8", textAlign: "center" }),
  card(24, 410, 342, 90, [icon(20, 22, 44, 44, "▶️", { fontSize: 40 }), txt(80, 28, 200, 20, "今すぐ再生", { fontSize: 16, fontWeight: 700 }), txt(80, 52, 200, 18, "48 分", { fontSize: 13, color: "#94a3b8" })]),
  txt(24, 530, 200, 22, "エピソード", { fontSize: 16, fontWeight: 700 }),
  ...Array.from({ length: 3 }).flatMap((_, i) => [txt(24, 576 + i * 64, 300, 20, `Ep.${41 - i} サンプルタイトル`, { fontSize: 15, fontWeight: 600 }), txt(24, 600 + i * 64, 300, 16, `${45 - i}分 · 5月${20 - i}日`, { fontSize: 12, color: "#94a3b8" }), divider(24, 632 + i * 64, 342, 1)]),
]));
add("メディア", "記事（ブログ）", screen("Article", 800, 980, "#ffffff", [
  navbar(800, "Journal", ["記事", "カテゴリ", "About"]),
  badge(80, 110, 90, 28, "デザイン", { background: "#eef2ff", color: "#4f46e5", fontSize: 13 }),
  txt(80, 156, 640, 90, "優れたUIを作るための10の原則", { fontSize: 40, fontWeight: 800, lineHeight: 1.2 }),
  avatar(80, 270, 44, 44, "A", { background: "#4f46e5", color: "#fff" }),
  txt(136, 276, 300, 18, "山田 太郎 · 6月1日 · 8分で読了", { fontSize: 13, color: "#94a3b8" }),
  rect(80, 340, 640, 320, { background: "linear-gradient(120deg, #a8edea, #fed6e3)", borderRadius: 16 }),
  txt(80, 690, 640, 120, "本文の段落がここに入ります。読みやすい行間と適切な文字サイズが、長文コンテンツの体験を大きく左右します。", { fontSize: 17, color: "#334155", lineHeight: 1.9 }),
  divider(80, 840, 640, 1),
  txt(80, 870, 640, 24, "関連記事", { fontSize: 18, fontWeight: 700 }),
]));

export const TEMPLATES: Template[] = T;

export const TEMPLATE_CATEGORIES: { category: string; items: Template[] }[] = (() => {
  const order: string[] = [];
  const map = new Map<string, Template[]>();
  for (const t of T) {
    if (!map.has(t.category)) {
      map.set(t.category, []);
      order.push(t.category);
    }
    map.get(t.category)!.push(t);
  }
  return order.map((category) => ({ category, items: map.get(category)! }));
})();
