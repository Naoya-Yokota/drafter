import type { Document } from "../src/ir/schema.ts";

/** Starter documents for "新規作成 → テンプレートから". Each is valid IR. */
export type Template = { id: string; label: string; doc: Document };

function screen(name: string, w: number, h: number, children: Document["root"]["children"]): Document {
  return {
    version: "0.1",
    name,
    canvas: { width: w, height: h, background: "#ffffff" },
    root: {
      id: "screen",
      type: "Frame",
      name: "Screen",
      frame: { x: 0, y: 0, w, h },
      style: { background: "#ffffff" },
      children,
    },
  };
}

export const TEMPLATES: Template[] = [
  {
    id: "blank",
    label: "空のスクリーン",
    doc: screen("Untitled", 390, 844, []),
  },
  {
    id: "login-simple",
    label: "ログイン（シンプル）",
    doc: screen("Login", 390, 844, [
      {
        id: "title",
        type: "Text",
        name: "Title",
        frame: { x: 40, y: 120, w: 310, h: 40 },
        props: { text: "ようこそ" },
        style: { fontSize: 28, fontWeight: 700, color: "#111827", textAlign: "center" },
      },
      {
        id: "email",
        type: "Input",
        name: "Email",
        frame: { x: 40, y: 220, w: 310, h: 48 },
        props: { placeholder: "メールアドレス", inputType: "email" },
        style: { border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16, background: "#ffffff" },
      },
      {
        id: "password",
        type: "Input",
        name: "Password",
        frame: { x: 40, y: 284, w: 310, h: 48 },
        props: { placeholder: "パスワード", inputType: "password" },
        style: { border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16, background: "#ffffff" },
      },
      {
        id: "submit",
        type: "Button",
        name: "Submit",
        frame: { x: 40, y: 360, w: 310, h: 48 },
        props: { label: "ログイン", variant: "primary" },
        style: { background: "#2563eb", color: "#ffffff", borderRadius: 8, fontSize: 16, fontWeight: 600, border: "none" },
      },
    ]),
  },
  {
    id: "login-social",
    label: "ログイン（ソーシャル）",
    doc: screen("Login Social", 390, 844, [
      { id: "title", type: "Text", name: "Title", frame: { x: 40, y: 100, w: 310, h: 36 }, props: { text: "ログイン" }, style: { fontSize: 26, fontWeight: 700, color: "#111827", textAlign: "center" } },
      { id: "email", type: "Input", name: "Email", frame: { x: 40, y: 176, w: 310, h: 48 }, props: { placeholder: "メールアドレス", inputType: "email" }, style: { border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16, background: "#ffffff" } },
      { id: "password", type: "Input", name: "Password", frame: { x: 40, y: 236, w: 310, h: 48 }, props: { placeholder: "パスワード", inputType: "password" }, style: { border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16, background: "#ffffff" } },
      { id: "remember", type: "Switch", name: "Remember", frame: { x: 40, y: 296, w: 240, h: 28 }, props: { label: "ログイン状態を保持", checked: true }, style: { fontSize: 14, color: "#374151" } },
      { id: "submit", type: "Button", name: "Submit", frame: { x: 40, y: 340, w: 310, h: 48 }, props: { label: "ログイン" }, style: { background: "#2563eb", color: "#ffffff", borderRadius: 8, fontSize: 16, fontWeight: 600, border: "none" } },
      { id: "divider", type: "Divider", name: "Divider", frame: { x: 40, y: 412, w: 310, h: 1 }, style: { background: "#e5e7eb" } },
      { id: "or", type: "Text", name: "Or", frame: { x: 40, y: 404, w: 310, h: 18 }, props: { text: "または" }, style: { fontSize: 12, color: "#9ca3af", textAlign: "center", background: "#ffffff" } },
      { id: "google", type: "Button", name: "Google", frame: { x: 40, y: 440, w: 310, h: 48 }, props: { label: "Googleで続ける" }, style: { background: "#ffffff", color: "#111827", borderRadius: 8, fontSize: 15, fontWeight: 600, border: "1px solid #d1d5db" } },
      { id: "apple", type: "Button", name: "Apple", frame: { x: 40, y: 500, w: 310, h: 48 }, props: { label: "Appleで続ける" }, style: { background: "#111827", color: "#ffffff", borderRadius: 8, fontSize: 15, fontWeight: 600, border: "none" } },
      { id: "signup", type: "Link", name: "Signup", frame: { x: 40, y: 568, w: 310, h: 24 }, props: { text: "アカウントを作成", href: "#" }, style: { color: "#2563eb", fontSize: 14, textAlign: "center" } },
    ]),
  },
  {
    id: "login-card",
    label: "ログイン（カード型）",
    doc: {
      version: "0.1",
      name: "Login Card",
      canvas: { width: 390, height: 844, background: "#f3f4f6" },
      root: {
        id: "screen",
        type: "Frame",
        name: "Screen",
        frame: { x: 0, y: 0, w: 390, h: 844 },
        style: { background: "#f3f4f6" },
        children: [
          {
            id: "card",
            type: "Frame",
            name: "Card",
            frame: { x: 24, y: 160, w: 342, h: 420 },
            style: { background: "#ffffff", borderRadius: 16, border: "1px solid #e5e7eb", shadow: "0 12px 32px rgba(0,0,0,0.10)" },
            children: [
              { id: "logo", type: "Avatar", name: "Logo", frame: { x: 147, y: 28, w: 48, h: 48 }, props: { text: "A" }, style: { background: "#2563eb", color: "#ffffff", fontWeight: 700 } },
              { id: "title", type: "Text", name: "Title", frame: { x: 24, y: 92, w: 294, h: 30 }, props: { text: "おかえりなさい" }, style: { fontSize: 22, fontWeight: 700, color: "#111827", textAlign: "center" } },
              { id: "email", type: "Input", name: "Email", frame: { x: 24, y: 148, w: 294, h: 46 }, props: { placeholder: "メールアドレス", inputType: "email" }, style: { border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, background: "#ffffff" } },
              { id: "password", type: "Input", name: "Password", frame: { x: 24, y: 204, w: 294, h: 46 }, props: { placeholder: "パスワード", inputType: "password" }, style: { border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, background: "#ffffff" } },
              { id: "submit", type: "Button", name: "Submit", frame: { x: 24, y: 268, w: 294, h: 46 }, props: { label: "ログイン" }, style: { background: "#2563eb", color: "#ffffff", borderRadius: 8, fontSize: 15, fontWeight: 600, border: "none" } },
              { id: "forgot", type: "Link", name: "Forgot", frame: { x: 24, y: 330, w: 294, h: 22 }, props: { text: "パスワードを忘れた方", href: "#" }, style: { color: "#6b7280", fontSize: 13, textAlign: "center" } },
            ],
          },
        ],
      },
    },
  },
  {
    id: "card",
    label: "カード",
    doc: screen("Card", 390, 844, [
      {
        id: "card",
        type: "Frame",
        name: "Card",
        frame: { x: 24, y: 80, w: 342, h: 260 },
        style: { background: "#ffffff", borderRadius: 16, border: "1px solid #e5e7eb", shadow: "0 8px 24px rgba(0,0,0,0.08)" },
        children: [
          {
            id: "cover",
            type: "Rectangle",
            name: "Cover",
            frame: { x: 0, y: 0, w: 342, h: 140 },
            style: { background: "#c7d2fe", borderRadius: 16 },
          },
          {
            id: "cardTitle",
            type: "Text",
            name: "CardTitle",
            frame: { x: 16, y: 156, w: 310, h: 28 },
            props: { text: "カードタイトル" },
            style: { fontSize: 18, fontWeight: 700, color: "#111827" },
          },
          {
            id: "cardBody",
            type: "Text",
            name: "CardBody",
            frame: { x: 16, y: 190, w: 310, h: 44 },
            props: { text: "説明テキストがここに入ります。" },
            style: { fontSize: 14, color: "#6b7280" },
          },
        ],
      },
    ]),
  },
];
