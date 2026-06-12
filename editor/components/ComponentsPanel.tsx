import type { Document } from "../../src/ir/schema.ts";

type Props = {
  components: Document["components"];
  selectionCount: number;
  onCreateFromSelection: () => void;
  onPlace: (componentId: string) => void;
  onRename: (componentId: string, name: string) => void;
  onDelete: (componentId: string) => void;
};

/**
 * Define and reuse components. "Componentize" the current selection, then place
 * more instances; each instance can be tweaked per-node via the Inspector while
 * sharing the same definition.
 */
export function ComponentsPanel({ components, selectionCount, onCreateFromSelection, onPlace, onRename, onDelete }: Props) {
  const entries = Object.entries(components ?? {});
  return (
    <div className="components-panel">
      <div className="panel-title">コンポーネント</div>
      <button
        onClick={onCreateFromSelection}
        disabled={selectionCount === 0}
        title={selectionCount === 0 ? "ノードを選択してください" : "選択をコンポーネント化してインスタンスに置換"}
        style={{ width: "100%", marginBottom: 8 }}
      >
        ◇ 選択をコンポーネント化{selectionCount > 1 ? `（${selectionCount}個）` : ""}
      </button>
      {entries.length === 0 && <div className="inspector empty" style={{ padding: 8 }}>コンポーネントはまだありません</div>}
      {entries.map(([id, def]) => (
        <div key={id} className="row" style={{ gap: 6, alignItems: "center" }}>
          <span title="コンポーネント" style={{ flex: "0 0 auto" }}>◇</span>
          <input
            type="text"
            defaultValue={def.name}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== def.name) onRename(id, v); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            style={{ flex: 1, minWidth: 0 }}
          />
          <button title="配置（インスタンスを追加）" onClick={() => onPlace(id)} style={{ flex: "0 0 auto" }}>＋配置</button>
          <button title="削除" onClick={() => onDelete(id)} style={{ flex: "0 0 auto" }}>✕</button>
        </div>
      ))}
    </div>
  );
}
