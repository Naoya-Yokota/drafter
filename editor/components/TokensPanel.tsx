import { useState } from "react";
import type { Tokens } from "../../src/ir/schema.ts";

type Props = {
  tokens: Tokens | undefined;
  onChange: (tokens: Tokens | undefined) => void;
};

function asHex(v: string): string {
  return /^#[0-9a-f]{6}$/i.test(v) ? v : "#000000";
}

/**
 * Manage the document's color tokens. A node style set to "{name}" references the
 * token here; editing a value re-themes every node that uses it at once (the
 * canvas and codegen both resolve the reference).
 */
export function TokensPanel({ tokens, onChange }: Props) {
  const colors = tokens?.colors ?? {};
  const entries = Object.entries(colors);
  const [newName, setNewName] = useState("");

  const setColors = (next: Record<string, string>) => {
    const cleaned = Object.keys(next).length ? next : undefined;
    onChange(cleaned ? { ...tokens, colors: cleaned } : undefined);
  };

  const rename = (oldName: string, name: string) => {
    const slug = name.trim().replace(/[^\w-]/g, "");
    if (!slug || slug === oldName || colors[slug] != null) return;
    const next: Record<string, string> = {};
    for (const [k, v] of entries) next[k === oldName ? slug : k] = v;
    setColors(next);
  };

  const add = () => {
    const slug = newName.trim().replace(/[^\w-]/g, "");
    if (!slug || colors[slug] != null) return;
    setColors({ ...colors, [slug]: "#2563eb" });
    setNewName("");
  };

  return (
    <div className="tokens-panel">
      <div className="panel-title">カラートークン</div>
      <p className="hint" style={{ margin: "0 0 8px" }}>
        スタイルの色に <code>{"{名前}"}</code> と入れると参照。1か所変えれば全インスタンスに反映されます。
      </p>
      {entries.length === 0 && <div className="inspector empty" style={{ padding: 8 }}>トークンはまだありません</div>}
      {entries.map(([name, value]) => (
        <div key={name} className="row" style={{ gap: 6, alignItems: "center" }}>
          <input type="color" value={asHex(value)} onChange={(e) => setColors({ ...colors, [name]: e.target.value })} style={{ width: 28, height: 28, padding: 0, flex: "0 0 auto" }} />
          <input
            type="text"
            defaultValue={name}
            title="トークン名"
            onBlur={(e) => rename(name, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            style={{ width: 90, flex: "0 0 auto" }}
          />
          <input type="text" value={value} onChange={(e) => setColors({ ...colors, [name]: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
          <button title="削除" onClick={() => { const next = { ...colors }; delete next[name]; setColors(next); }} style={{ flex: "0 0 auto" }}>✕</button>
        </div>
      ))}
      <div className="row" style={{ gap: 6, marginTop: 8 }}>
        <input
          type="text"
          placeholder="新しいトークン名 (例: brand)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          style={{ flex: 1, minWidth: 0 }}
        />
        <button onClick={add} disabled={!newName.trim()} style={{ flex: "0 0 auto" }}>＋追加</button>
      </div>
    </div>
  );
}
