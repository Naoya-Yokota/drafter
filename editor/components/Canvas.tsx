import { useRef, useState, useEffect } from "react";
import type { Document, Frame, Node } from "../../src/ir/schema.ts";
import { nodeBoxStyle, layoutToFlexCss, isFlex } from "../render.ts";
import { findParent, absoluteOrigin, absBoxes, editableTextKey } from "../store.ts";
import { snapMove, snapResize, type Guide } from "../snap.ts";

type GroupItem = { id: string; frame: Frame };

type DragState = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  frame: Frame;
  duplicate: boolean;
  moved: boolean;
  parentW: number;
  parentH: number;
  parentOX: number;
  parentOY: number;
  siblings: Frame[];
  group: GroupItem[];
};

type Rect = { x: number; y: number; w: number; h: number };
type Badge = { x: number; y: number; text: string };

type Props = {
  doc: Document;
  zoom: number;
  selectedIds: string[];
  onSelectOnly: (id: string | null) => void;
  onToggleSelect: (id: string) => void;
  onSelectMany: (ids: string[]) => void;
  onPatchFrames: (updates: GroupItem[], commitStep?: boolean) => void;
  onDuplicateDrop: (id: string, original: Frame, dropped: Frame) => void;
  onContextNode: (e: React.MouseEvent, id: string) => void;
  onEditText: (id: string, value: string) => void;
  onZoom: (z: number) => void;
};

const HANDLE = 10;

function findNodeRef(node: Node, id: string): Node | null {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const hit = findNodeRef(c, id);
    if (hit) return hit;
  }
  return null;
}

function nodeInner(node: Node): React.ReactNode {
  const p = node.props ?? {};
  switch (node.type) {
    case "Text":
      return p.text ?? "";
    case "Button":
      return p.label ?? "";
    case "Badge":
      return p.text ?? p.label ?? "";
    case "Link":
      return <span style={{ textDecoration: "underline" }}>{p.text ?? p.label ?? "リンク"}</span>;
    case "Input":
      return <span style={{ color: "#9ca3af" }}>{p.placeholder ?? ""}</span>;
    case "Textarea":
      return <span style={{ color: p.body ? "inherit" : "#9ca3af", whiteSpace: "pre-wrap", alignSelf: "flex-start" }}>{p.body || p.placeholder || ""}</span>;
    case "Checkbox":
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid #9ca3af", background: p.checked ? "#2563eb" : "#fff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{p.checked ? "✓" : ""}</span>
          {p.label}
        </span>
      );
    case "Switch":
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ position: "relative", width: 40, height: 22, borderRadius: 999, background: p.checked ? "#2563eb" : "#cbd5e1" }}>
            <span style={{ position: "absolute", top: 2, left: p.checked ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
          </span>
          {p.label}
        </span>
      );
    case "Select":
      return (
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0 10px" }}>
          <span>{p.options?.[0] ?? "選択…"}</span>
          <span>▾</span>
        </span>
      );
    case "Avatar":
      return p.src ? <img src={p.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : <span>{(p.text ?? node.name ?? "?").slice(0, 2)}</span>;
    case "List":
      return (
        <ul style={{ margin: 0, paddingLeft: 20, alignSelf: "stretch" }}>
          {(p.items ?? []).map((i, k) => (
            <li key={k}>{i}</li>
          ))}
        </ul>
      );
    case "Accordion":
      return <span style={{ fontWeight: 600, alignSelf: "flex-start", padding: 8 }}>▸ {p.title ?? "詳細"}</span>;
    case "NavBar":
      return (
        <span style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", padding: "0 16px" }}>
          <b>{p.title ?? "Menu"}</b>
          <span style={{ display: "flex", gap: 16, marginLeft: "auto" }}>
            {(p.items ?? []).map((i, k) => (
              <span key={k}>{i}</span>
            ))}
            {p.collapsible !== false && <span>☰</span>}
          </span>
        </span>
      );
    case "Image":
      return p.src ? <img src={p.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#9ca3af" }}>🖼</span>;
    default:
      return null;
  }
}

export function Canvas({ doc, zoom, selectedIds, onSelectOnly, onToggleSelect, onSelectMany, onPatchFrames, onDuplicateDrop, onContextNode, onEditText, onZoom }: Props) {
  const drag = useRef<DragState | null>(null);
  const marquee = useRef<{ sx: number; sy: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<Rect | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const next = Math.min(2, Math.max(0.25, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      onZoom(Math.round(next * 100) / 100);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, onZoom]);

  function toStage(clientX: number, clientY: number): { x: number; y: number } {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  }

  function beginDrag(e: React.PointerEvent, node: Node, mode: DragState["mode"]) {
    if (node.locked) return;
    e.stopPropagation();
    const additive = e.ctrlKey && !e.shiftKey && mode === "move";
    let groupIds: string[];
    if (mode === "resize") {
      onSelectOnly(node.id);
      groupIds = [node.id];
    } else if (additive) {
      const nowSelected = !selectedIds.includes(node.id);
      onToggleSelect(node.id);
      if (!nowSelected) return;
      groupIds = Array.from(new Set([...selectedIds, node.id]));
    } else if (selectedIds.includes(node.id) && selectedIds.length > 1) {
      groupIds = selectedIds;
    } else {
      onSelectOnly(node.id);
      groupIds = [node.id];
    }

    const parent = findParent(doc.root, node.id);
    const rootParent = !parent || parent.id === doc.root.id;
    const parentW = rootParent ? doc.canvas.width : parent!.frame.w;
    const parentH = rootParent ? doc.canvas.height : parent!.frame.h;
    const po = rootParent ? { x: 0, y: 0 } : absoluteOrigin(doc.root, parent!.id);
    const group: GroupItem[] = groupIds.map((id) => ({ id, frame: { ...(findNodeRef(doc.root, id)?.frame ?? node.frame) } }));
    const groupSet = new Set(groupIds);
    const siblings = (parent?.children ?? []).filter((c) => !groupSet.has(c.id)).map((c) => c.frame);

    drag.current = { id: node.id, mode, startX: e.clientX, startY: e.clientY, frame: { ...node.frame }, duplicate: mode === "move" && e.ctrlKey && e.shiftKey, moved: false, parentW, parentH, parentOX: po.x, parentOY: po.y, siblings, group };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onScrollDown(e: React.PointerEvent) {
    if (editing) return;
    const p = toStage(e.clientX, e.clientY);
    marquee.current = { sx: p.x, sy: p.y };
    setMarqueeRect({ x: p.x, y: p.y, w: 0, h: 0 });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (d) {
      const dx = (e.clientX - d.startX) / zoom;
      const dy = (e.clientY - d.startY) / zoom;
      const parentBox = { w: d.parentW, h: d.parentH };
      const first = !d.moved && !d.duplicate;
      d.moved = true;

      if (d.mode === "move") {
        let nx = d.frame.x + dx;
        let ny = d.frame.y + dy;
        if (e.shiftKey && !e.ctrlKey) {
          if (Math.abs(dx) >= Math.abs(dy)) ny = d.frame.y;
          else nx = d.frame.x;
        }
        const snapped = snapMove({ ...d.frame, x: nx, y: ny }, d.siblings, parentBox);
        const ddx = snapped.x - d.frame.x;
        const ddy = snapped.y - d.frame.y;
        const updates = d.group.map((g) => ({ id: g.id, frame: { ...g.frame, x: Math.round(g.frame.x + ddx), y: Math.round(g.frame.y + ddy) } }));
        onPatchFrames(updates, first);
        setGuides(d.group.length === 1 ? absolutize(snapped.guides, d) : []);
        setBadge({ x: d.parentOX + snapped.x, y: d.parentOY + snapped.y, text: `${snapped.x}, ${snapped.y}` });
      } else {
        const nw = Math.max(8, d.frame.w + dx);
        const nh = Math.max(8, d.frame.h + dy);
        const snapped = snapResize({ ...d.frame, w: nw, h: nh }, d.siblings, parentBox);
        onPatchFrames([{ id: d.id, frame: { ...d.frame, w: snapped.w, h: snapped.h } }], first);
        setGuides(absolutize(snapped.guides, d));
        setBadge({ x: d.parentOX + d.frame.x, y: d.parentOY + d.frame.y, text: `${snapped.w} × ${snapped.h}` });
      }
      return;
    }
    if (marquee.current) {
      const p = toStage(e.clientX, e.clientY);
      const m = marquee.current;
      setMarqueeRect({ x: Math.min(m.sx, p.x), y: Math.min(m.sy, p.y), w: Math.abs(p.x - m.sx), h: Math.abs(p.y - m.sy) });
    }
  }

  function absolutize(gs: Guide[], d: DragState): Guide[] {
    return gs.map((g) => ({ axis: g.axis, pos: g.axis === "x" ? d.parentOX + g.pos : d.parentOY + g.pos }));
  }

  function endDrag() {
    const d = drag.current;
    drag.current = null;
    setGuides([]);
    setBadge(null);
    if (d && d.duplicate && d.moved) {
      const node = findNodeRef(doc.root, d.id);
      if (node) onDuplicateDrop(d.id, d.frame, node.frame);
    }
    if (marquee.current) {
      marquee.current = null;
      const r = marqueeRect;
      setMarqueeRect(null);
      if (r && (r.w > 3 || r.h > 3)) {
        const hits = absBoxes(doc.root)
          .filter((b) => b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y)
          .map((b) => b.id)
          .filter((id) => {
            const n = findNodeRef(doc.root, id);
            return n && !n.locked && !n.hidden;
          });
        onSelectMany(hits);
      } else {
        onSelectOnly(null);
      }
    }
  }

  function renderNode(node: Node, isRoot: boolean, parentFlex: boolean): React.ReactNode {
    if (!isRoot && node.hidden) return null;
    const selected = selectedIds.includes(node.id);
    const flexContainer = isFlex(node);
    const hasChildren = (node.children?.length ?? 0) > 0;
    const editKey = editableTextKey(node.type);

    const style: React.CSSProperties = isRoot
      ? { position: "relative", width: doc.canvas.width, height: doc.canvas.height, background: doc.canvas.background, overflow: "hidden", ...(flexContainer ? layoutToFlexCss(node.layout) : {}) }
      : {
          ...nodeBoxStyle(node),
          ...(parentFlex ? { position: "relative", left: "auto", top: "auto" } : {}),
          ...(flexContainer ? layoutToFlexCss(node.layout) : {}),
          outline: selected ? "2px solid #2563eb" : "1px solid rgba(0,0,0,0.06)",
          outlineOffset: selected ? 0 : -1,
          cursor: node.locked ? "default" : "move",
          overflow: "hidden",
        };

    const inner = !flexContainer && !hasChildren ? nodeInner(node) : null;
    const innerJustify = node.style?.textAlign === "center" ? "center" : node.style?.textAlign === "right" ? "flex-end" : "flex-start";
    const isEditing = editing === node.id;

    return (
      <div
        key={node.id}
        style={style}
        onPointerDown={isRoot || isEditing ? undefined : (e) => beginDrag(e, node, "move")}
        onDoubleClick={isRoot || !editKey ? undefined : (e) => { e.stopPropagation(); onSelectOnly(node.id); setEditing(node.id); }}
        onContextMenu={isRoot ? undefined : (e) => { e.preventDefault(); e.stopPropagation(); onContextNode(e, node.id); }}
      >
        {inner != null && !isEditing && (
          <div style={{ pointerEvents: "none", position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: innerJustify, padding: "0 4px", overflow: "hidden" }}>
            {inner}
          </div>
        )}
        {isEditing && editKey && (
          <textarea
            autoFocus
            defaultValue={(node.props?.[editKey] as string) ?? ""}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => { onEditText(node.id, e.target.value); setEditing(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
              else if (e.key === "Escape") setEditing(null);
            }}
            style={{ position: "absolute", inset: 0, border: "none", outline: "2px solid #2563eb", padding: "0 4px", font: "inherit", color: "inherit", background: "rgba(255,255,255,0.85)", resize: "none", textAlign: node.style?.textAlign ?? "left" }}
          />
        )}
        {(node.children ?? []).map((c) => renderNode(c, false, flexContainer))}
        {selected && !isRoot && !node.locked && selectedIds.length === 1 ? (
          <div onPointerDown={(e) => beginDrag(e, node, "resize")} style={{ position: "absolute", right: -HANDLE / 2, bottom: -HANDLE / 2, width: HANDLE, height: HANDLE, background: "#2563eb", border: "2px solid #fff", borderRadius: 2, cursor: "nwse-resize" }} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="canvas-scroll" ref={scrollRef} onPointerDown={onScrollDown} onPointerMove={onMove} onPointerUp={endDrag}>
      <div className="canvas-sizer" style={{ width: doc.canvas.width * zoom, height: doc.canvas.height * zoom }}>
        <div className="canvas-stage" ref={stageRef} style={{ width: doc.canvas.width, height: doc.canvas.height, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          {renderNode(doc.root, true, isFlex(doc.root))}
          {guides.map((g, i) =>
            g.axis === "x" ? (
              <div key={i} className="guide guide-v" style={{ left: g.pos, height: doc.canvas.height }} />
            ) : (
              <div key={i} className="guide guide-h" style={{ top: g.pos, width: doc.canvas.width }} />
            ),
          )}
          {marqueeRect && <div className="marquee" style={{ left: marqueeRect.x, top: marqueeRect.y, width: marqueeRect.w, height: marqueeRect.h }} />}
          {badge && <div className="drag-badge" style={{ left: badge.x, top: badge.y - 22 }}>{badge.text}</div>}
        </div>
      </div>
    </div>
  );
}
