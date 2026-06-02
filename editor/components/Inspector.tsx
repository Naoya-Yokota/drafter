import { useState } from "react";
import type { Node, Style, Layout, Props as NodeProps } from "../../src/ir/schema.ts";
import { ColorField } from "./ColorField.tsx";

type Patch = Partial<Node>;

export type AlignEdge = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

type Props = {
  node: Node | null;
  busy: boolean;
  docColors: string[];
  onPatch: (id: string, patch: Patch) => void;
  onDelete: (id: string) => void;
  onAlign: (id: string, edge: AlignEdge) => void;
  onAddComment: (id: string, text: string) => void;
  onResolveComment: (id: string, commentId: string, resolved: boolean) => void;
  onAiResolve: (id: string) => void;
};

/** Evaluate a tiny arithmetic expression like "120+8" or "300/2"; else NaN. */
function evalExpr(s: string): number {
  const t = s.trim();
  if (/^-?\d*\.?\d+$/.test(t)) return Number(t);
  if (/^[-+*/().\d\s]+$/.test(t)) {
    try {
      const v = Function(`"use strict";return (${t})`)();
      return typeof v === "number" && Number.isFinite(v) ? v : NaN;
    } catch {
      return NaN;
    }
  }
  return NaN;
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft == null) return;
    const v = evalExpr(draft);
    if (!Number.isNaN(v)) onChange(Math.round(v));
    setDraft(null);
  };
  return (
    <label className="row">
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft ?? (Number.isFinite(value) ? String(value) : "0")}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(null);
          }
        }}
      />
    </label>
  );
}

function TextRow({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label className="row">
      <span>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function CheckRow({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="row">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} style={{ width: "auto" }} />
    </label>
  );
}

/** Edit a string[] as one item per line. */
function LinesRow({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <label className="row col">
      <span>{label}（1行に1項目）</span>
      <textarea
        rows={4}
        value={(value ?? []).join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
      />
    </label>
  );
}

function AreaRow({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label className="row col">
      <span>{label}</span>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Inspector({ node, busy, docColors, onPatch, onDelete, onAlign, onAddComment, onResolveComment, onAiResolve }: Props) {
  const [draft, setDraft] = useState("");
  if (!node) return <div className="inspector empty">ノードを選択してください</div>;

  const setFrame = (k: "x" | "y" | "w" | "h", v: number) =>
    onPatch(node.id, { frame: { ...node.frame, [k]: v } });
  const setStyle = (patch: Partial<Style>) =>
    onPatch(node.id, { style: { ...(node.style ?? {}), ...patch } });
  const setProps = (patch: Partial<NodeProps>) =>
    onPatch(node.id, { props: { ...(node.props ?? {}), ...patch } });
  const setLayout = (patch: Partial<Layout>) =>
    onPatch(node.id, { layout: { mode: node.layout?.mode ?? "absolute", ...(node.layout ?? {}), ...patch } });

  const s = node.style ?? {};
  const lay = node.layout;
  const openComments = (node.comments ?? []).filter((c) => !c.resolved);

  return (
    <div className="inspector">
      <div className="inspector-head">
        <span className="badge">{node.type}</span>
        <code>{node.id}</code>
      </div>

      <TextRow label="name" value={node.name ?? ""} onChange={(v) => onPatch(node.id, { name: v })} />

      <h4>Frame</h4>
      <div className="grid2">
        <NumberRow label="x" value={node.frame.x} onChange={(v) => setFrame("x", v)} />
        <NumberRow label="y" value={node.frame.y} onChange={(v) => setFrame("y", v)} />
        <NumberRow label="w" value={node.frame.w} onChange={(v) => setFrame("w", v)} />
        <NumberRow label="h" value={node.frame.h} onChange={(v) => setFrame("h", v)} />
      </div>

      <h4>Props</h4>
      {node.type === "Text" && (
        <TextRow label="text" value={node.props?.text ?? ""} onChange={(v) => setProps({ text: v })} />
      )}
      {node.type === "Button" && (
        <TextRow label="label" value={node.props?.label ?? ""} onChange={(v) => setProps({ label: v })} />
      )}
      {node.type === "Input" && (
        <>
          <TextRow label="placeholder" value={node.props?.placeholder ?? ""} onChange={(v) => setProps({ placeholder: v })} />
          <TextRow label="inputType" value={node.props?.inputType ?? "text"} onChange={(v) => setProps({ inputType: v })} />
        </>
      )}
      {node.type === "Image" && (
        <>
          <TextRow label="src" value={node.props?.src ?? ""} onChange={(v) => setProps({ src: v })} />
          <TextRow label="alt" value={node.props?.alt ?? ""} onChange={(v) => setProps({ alt: v })} />
        </>
      )}
      {node.type === "Link" && (
        <>
          <TextRow label="text" value={node.props?.text ?? ""} onChange={(v) => setProps({ text: v })} />
          <TextRow label="href" value={node.props?.href ?? ""} onChange={(v) => setProps({ href: v })} />
        </>
      )}
      {node.type === "Textarea" && (
        <>
          <TextRow label="placeholder" value={node.props?.placeholder ?? ""} onChange={(v) => setProps({ placeholder: v })} />
          <AreaRow label="初期テキスト" value={node.props?.body ?? ""} onChange={(v) => setProps({ body: v })} />
        </>
      )}
      {(node.type === "Checkbox" || node.type === "Switch") && (
        <>
          <TextRow label="label" value={node.props?.label ?? ""} onChange={(v) => setProps({ label: v })} />
          <CheckRow label="checked" value={node.props?.checked ?? false} onChange={(v) => setProps({ checked: v })} />
        </>
      )}
      {node.type === "Select" && (
        <LinesRow label="options" value={node.props?.options ?? []} onChange={(v) => setProps({ options: v })} />
      )}
      {(node.type === "Badge" || node.type === "Avatar") && (
        <TextRow label="text" value={node.props?.text ?? ""} onChange={(v) => setProps({ text: v })} />
      )}
      {node.type === "Avatar" && (
        <TextRow label="src（画像URL）" value={node.props?.src ?? ""} onChange={(v) => setProps({ src: v })} />
      )}
      {node.type === "List" && (
        <LinesRow label="items" value={node.props?.items ?? []} onChange={(v) => setProps({ items: v })} />
      )}
      {node.type === "Accordion" && (
        <>
          <TextRow label="title" value={node.props?.title ?? ""} onChange={(v) => setProps({ title: v })} />
          <AreaRow label="body" value={node.props?.body ?? ""} onChange={(v) => setProps({ body: v })} />
        </>
      )}
      {node.type === "NavBar" && (
        <>
          <TextRow label="brand" value={node.props?.title ?? ""} onChange={(v) => setProps({ title: v })} />
          <LinesRow label="メニュー項目" value={node.props?.items ?? []} onChange={(v) => setProps({ items: v })} />
          <CheckRow label="開閉式(burger)" value={node.props?.collapsible ?? true} onChange={(v) => setProps({ collapsible: v })} />
        </>
      )}
      {node.type === "Icon" && (
        <TextRow label="アイコン(絵文字/字)" value={node.props?.text ?? ""} onChange={(v) => setProps({ text: v })} />
      )}
      {node.type === "ProgressBar" && (
        <NumberRow label="value (0-100)" value={node.props?.value ?? 50} onChange={(v) => setProps({ value: Math.max(0, Math.min(100, v)) })} />
      )}
      {node.type === "Embed" && (
        <>
          <AreaRow label="埋め込みURL (iframe)" value={node.props?.src ?? ""} onChange={(v) => setProps({ src: v || undefined })} />
          <TextRow label="代替テキスト" value={node.props?.title ?? ""} onChange={(v) => setProps({ title: v })} />
          <p className="hint">Googleマップ/YouTube等の「埋め込み(iframe)のsrc」を貼ってください。</p>
        </>
      )}

      <h4>Style</h4>
      <ColorField label="background" value={s.background} docColors={docColors} onChange={(v) => setStyle({ background: v })} />
      <ColorField label="color（文字）" value={s.color} docColors={docColors} onChange={(v) => setStyle({ color: v })} />
      <NumberRow label="fontSize" value={s.fontSize ?? 0} onChange={(v) => setStyle({ fontSize: v || undefined })} />
      <NumberRow label="borderRadius" value={s.borderRadius ?? 0} onChange={(v) => setStyle({ borderRadius: v || undefined })} />
      <NumberRow label="padding" value={s.padding ?? 0} onChange={(v) => setStyle({ padding: v || undefined })} />
      <TextRow label="border" value={s.border ?? ""} onChange={(v) => setStyle({ border: v || undefined })} />
      <TextRow label="shadow" value={s.shadow ?? ""} onChange={(v) => setStyle({ shadow: v || undefined })} />
      <label className="row">
        <span>overflow（スクロール）</span>
        <select value={s.overflow ?? "visible"} onChange={(e) => setStyle({ overflow: e.target.value === "visible" ? undefined : (e.target.value as Style["overflow"]) })}>
          <option value="visible">visible</option>
          <option value="hidden">hidden</option>
          <option value="auto">auto（必要時スクロール）</option>
          <option value="scroll">scroll（常時）</option>
        </select>
      </label>
      <label className="row">
        <span>textAlign</span>
        <select
          value={s.textAlign ?? "left"}
          onChange={(e) => setStyle({ textAlign: e.target.value as Style["textAlign"] })}
        >
          <option value="left">left</option>
          <option value="center">center</option>
          <option value="right">right</option>
        </select>
      </label>
      <label className="row">
        <span>fontFamily</span>
        <input
          type="text"
          list="font-suggestions"
          value={s.fontFamily ?? ""}
          placeholder="system-ui"
          onChange={(e) => setStyle({ fontFamily: e.target.value || undefined })}
        />
        <datalist id="font-suggestions">
          <option value="system-ui, sans-serif" />
          <option value="'Hiragino Sans', 'Yu Gothic', sans-serif" />
          <option value="'Noto Sans JP', sans-serif" />
          <option value="Georgia, serif" />
          <option value="'Courier New', monospace" />
        </datalist>
      </label>
      <label className="row">
        <span>fontWeight</span>
        <select
          value={String(s.fontWeight ?? "")}
          onChange={(e) => setStyle({ fontWeight: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">—</option>
          <option value="400">400 (normal)</option>
          <option value="500">500</option>
          <option value="600">600</option>
          <option value="700">700 (bold)</option>
          <option value="800">800</option>
        </select>
      </label>

      <h4>透過 (opacity)</h4>
      <label className="row">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.opacity ?? 1}
          onChange={(e) => setStyle({ opacity: Number(e.target.value) === 1 ? undefined : Number(e.target.value) })}
          style={{ flex: 1 }}
        />
        <span style={{ width: 36, textAlign: "right" }}>{Math.round((s.opacity ?? 1) * 100)}%</span>
      </label>

      <h4>整列（親の枠基準）</h4>
      <div className="align-grid">
        <button title="左揃え" onClick={() => onAlign(node.id, "left")}>⬅</button>
        <button title="左右中央" onClick={() => onAlign(node.id, "hcenter")}>↔</button>
        <button title="右揃え" onClick={() => onAlign(node.id, "right")}>➡</button>
        <button title="上揃え" onClick={() => onAlign(node.id, "top")}>⬆</button>
        <button title="上下中央" onClick={() => onAlign(node.id, "vcenter")}>↕</button>
        <button title="下揃え" onClick={() => onAlign(node.id, "bottom")}>⬇</button>
      </div>

      {node.type === "Frame" && (
        <>
          <h4>レイアウト</h4>
          <label className="row">
            <span>mode</span>
            <select value={lay?.mode ?? "absolute"} onChange={(e) => setLayout({ mode: e.target.value as Layout["mode"] })}>
              <option value="absolute">absolute（自由配置）</option>
              <option value="flex">flex（自動整列）</option>
            </select>
          </label>
          {lay?.mode === "flex" && (
            <>
              <label className="row">
                <span>direction</span>
                <select value={lay.direction ?? "row"} onChange={(e) => setLayout({ direction: e.target.value as Layout["direction"] })}>
                  <option value="row">row（横）</option>
                  <option value="column">column（縦）</option>
                </select>
              </label>
              <NumberRow label="gap" value={lay.gap ?? 0} onChange={(v) => setLayout({ gap: v })} />
              <NumberRow label="padding" value={lay.padding ?? 0} onChange={(v) => setLayout({ padding: v })} />
              <label className="row">
                <span>align</span>
                <select value={lay.align ?? "start"} onChange={(e) => setLayout({ align: e.target.value as Layout["align"] })}>
                  <option value="start">start</option>
                  <option value="center">center</option>
                  <option value="end">end</option>
                  <option value="stretch">stretch</option>
                </select>
              </label>
              <label className="row">
                <span>justify</span>
                <select value={lay.justify ?? "start"} onChange={(e) => setLayout({ justify: e.target.value as Layout["justify"] })}>
                  <option value="start">start</option>
                  <option value="center">center</option>
                  <option value="end">end</option>
                  <option value="between">between</option>
                </select>
              </label>
            </>
          )}
        </>
      )}

      <h4>コメント / AI修正</h4>
      <div className="comments">
        {(node.comments ?? []).map((c) => (
          <div key={c.id} className={`comment${c.resolved ? " resolved" : ""}`}>
            <input type="checkbox" checked={c.resolved} onChange={(e) => onResolveComment(node.id, c.id, e.target.checked)} />
            <span className="comment-text">{c.text}</span>
            <span className="comment-author">{c.author}</span>
          </div>
        ))}
        <textarea
          rows={2}
          placeholder="このノードへの指示をコメントで（例: 角を丸く、色を濃い青に）"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="comment-actions">
          <button
            onClick={() => {
              if (draft.trim()) {
                onAddComment(node.id, draft.trim());
                setDraft("");
              }
            }}
          >
            コメント追加
          </button>
          <button
            className="ai"
            disabled={busy || openComments.length === 0}
            title={openComments.length === 0 ? "未解決コメントがありません" : "裏で claude を実行してIRを更新します"}
            onClick={() => onAiResolve(node.id)}
          >
            {busy ? "AI実行中…" : `AIで修正 (${openComments.length})`}
          </button>
        </div>
      </div>

      <button className="danger" onClick={() => onDelete(node.id)}>
        このノードを削除
      </button>
    </div>
  );
}
