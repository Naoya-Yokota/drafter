import type { Node } from "../../src/ir/schema.ts";

type Props = {
  root: Node;
  selectedIds: string[];
  onSelect: (id: string, additive: boolean) => void;
  onContext: (e: React.MouseEvent, id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleHide: (id: string) => void;
};

function Row({ node, depth, ...h }: { node: Node; depth: number } & Omit<Props, "root">) {
  const isRoot = depth === 0;
  return (
    <>
      <div
        className={`tree-row${h.selectedIds.includes(node.id) ? " selected" : ""}${node.hidden ? " hidden" : ""}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={(e) => h.onSelect(node.id, e.ctrlKey || e.metaKey)}
        onContextMenu={(e) => { e.preventDefault(); h.onContext(e, node.id); }}
      >
        <span className="tree-type">{node.type}</span>
        <span className="tree-name">{node.name ?? node.id}</span>
        {!isRoot && (
          <>
            <button className={`tree-icon${node.locked ? " active" : ""}`} title={node.locked ? "ロック解除" : "ロック"} onClick={(e) => { e.stopPropagation(); h.onToggleLock(node.id); }}>
              {node.locked ? "🔒" : "🔓"}
            </button>
            <button className={`tree-icon${node.hidden ? " active" : ""}`} title={node.hidden ? "表示" : "非表示"} onClick={(e) => { e.stopPropagation(); h.onToggleHide(node.id); }}>
              {node.hidden ? "🙈" : "👁"}
            </button>
            <button className="tree-more" title="メニュー" onClick={(e) => { e.stopPropagation(); h.onContext(e, node.id); }}>⋯</button>
          </>
        )}
      </div>
      {(node.children ?? []).map((c) => (
        <Row key={c.id} node={c} depth={depth + 1} {...h} />
      ))}
    </>
  );
}

export function Tree({ root, ...h }: Props) {
  return (
    <div className="tree">
      <Row node={root} depth={0} {...h} />
    </div>
  );
}
