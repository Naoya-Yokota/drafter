import { useRef, useState, useEffect } from "react";
import type { Document, Frame, Node, Tokens } from "../../src/ir/schema.ts";
import { nodeBoxStyle, layoutToFlexCss, isFlex } from "../render.ts";
import { findParent, absoluteOrigin, absBoxes, editableTextKey, type AbsBox } from "../store.ts";
import { materializeInstance } from "../../src/ir/instance.ts";
import { snapMove, snapResize, type Guide } from "../snap.ts";

type GroupItem = { id: string; frame: Frame };

type DragState = {
  id: string;
  mode: "move" | "resize";
  handle?: HandleDir;
  startX: number;
  startY: number;
  frame: Frame;
  duplicate: boolean;
  moved: boolean;
  reparent?: string | null;
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
  onReparent: (id: string, newParentId: string) => void;
  onContextNode: (e: React.MouseEvent, id: string) => void;
  onEditText: (id: string, value: string) => void;
  onZoom: (z: number) => void;
};

const HANDLE = 10;

type HandleDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: { key: HandleDir }[] = [{ key: "nw" }, { key: "n" }, { key: "ne" }, { key: "e" }, { key: "se" }, { key: "s" }, { key: "sw" }, { key: "w" }];
const HANDLE_CURSOR: Record<HandleDir, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };

function handleStyle(h: { key: HandleDir }): React.CSSProperties {
  const k = h.key;
  const horiz = k.includes("w") ? "left" : k.includes("e") ? "right" : "center";
  const vert = k.includes("n") ? "top" : k.includes("s") ? "bottom" : "center";
  const st: React.CSSProperties = { position: "absolute", width: HANDLE, height: HANDLE, background: "#2563eb", border: "2px solid #fff", borderRadius: 2, cursor: HANDLE_CURSOR[k], zIndex: 10 };
  if (horiz === "left") st.left = -HANDLE / 2;
  else if (horiz === "right") st.right = -HANDLE / 2;
  else st.left = "50%";
  if (vert === "top") st.top = -HANDLE / 2;
  else if (vert === "bottom") st.bottom = -HANDLE / 2;
  else st.top = "50%";
  st.transform = `translate(${horiz === "center" ? "-50%" : "0"}, ${vert === "center" ? "-50%" : "0"})`;
  return st;
}

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
    case "Icon":
      return <span style={{ lineHeight: 1 }}>{p.text ?? "★"}</span>;
    case "ProgressBar":
      return <span style={{ position: "absolute", inset: 0, display: "block", borderRadius: "inherit", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${Math.max(0, Math.min(100, p.value ?? 50))}%`, background: "#2563eb" }} /></span>;
    case "Embed":
      return p.src ? (
        <iframe src={p.src} title="" loading="lazy" style={{ width: "100%", height: "100%", border: 0, borderRadius: "inherit" }} />
      ) : (
        <span style={{ color: "#6b7280" }}>🗺 {p.title ?? "Embed"}</span>
      );
    default:
      return null;
  }
}

/**
 * Read-only render of a resolved subtree (a component instance's content). Mirrors
 * the interactive renderNode visually but has no selection, drag, or handles —
 * the Instance box is the single selectable/draggable unit on the canvas.
 */
function renderStatic(node: Node, parentFlex: boolean, tokens?: Tokens): React.ReactNode {
  if (node.hidden) return null;
  const flexContainer = isFlex(node);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const style: React.CSSProperties = {
    ...nodeBoxStyle(node, tokens),
    ...(parentFlex ? { position: "relative", left: "auto", top: "auto" } : {}),
    ...(flexContainer ? layoutToFlexCss(node.layout) : {}),
    overflow: "hidden",
  };
  const inner = !flexContainer && !hasChildren ? nodeInner(node) : null;
  const innerJustify = node.style?.textAlign === "center" ? "center" : node.style?.textAlign === "right" ? "flex-end" : "flex-start";
  const fullBleed = node.type === "Image" || node.type === "Embed" || node.type === "ProgressBar" || node.type === "Avatar";
  const innerStyle: React.CSSProperties = fullBleed
    ? { pointerEvents: "none", position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit" }
    : { pointerEvents: "none", position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: innerJustify, padding: "0 4px", overflow: "hidden" };
  return (
    <div key={node.id} style={{ ...style, pointerEvents: "none" }}>
      {inner != null && <div style={innerStyle}>{inner}</div>}
      {(node.children ?? []).map((c) => renderStatic(c, flexContainer, tokens))}
    </div>
  );
}

type MeasureSeg = { x: number; y: number; w: number; h: number; vertical: boolean; label: string };

export function Canvas({ doc, zoom, selectedIds, onSelectOnly, onToggleSelect, onSelectMany, onPatchFrames, onDuplicateDrop, onReparent, onContextNode, onEditText, onZoom }: Props) {
  const drag = useRef<DragState | null>(null);
  const marquee = useRef<{ sx: number; sy: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<Rect | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [reparentId, setReparentId] = useState<string | null>(null);
  const [measure, setMeasure] = useState<MeasureSeg[] | null>(null);
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

  // The deepest (smallest) Frame whose box contains (ax,ay), excluding the dragged
  // node and its descendants; falls back to the root canvas.
  function reparentTargetAt(ax: number, ay: number, draggedId: string): string {
    const dragged = findNodeRef(doc.root, draggedId);
    let best: { id: string; area: number } | null = null;
    for (const b of absBoxes(doc.root)) {
      if (b.id === draggedId) continue;
      const n = findNodeRef(doc.root, b.id);
      if (!n || n.type !== "Frame") continue;
      if (dragged && findNodeRef(dragged, b.id)) continue;
      if (ax < b.x || ax > b.x + b.w || ay < b.y || ay > b.y + b.h) continue;
      const area = b.w * b.h;
      if (!best || area < best.area) best = { id: b.id, area };
    }
    return best?.id ?? doc.root.id;
  }

  // The deepest node box under a point (for Alt-measure), excluding one id.
  function nodeBoxAt(ax: number, ay: number, excludeId: string): AbsBox | null {
    let best: AbsBox | null = null;
    for (const b of absBoxes(doc.root)) {
      if (b.id === excludeId) continue;
      if (ax < b.x || ax > b.x + b.w || ay < b.y || ay > b.y + b.h) continue;
      if (!best || b.w * b.h < best.w * best.h) best = b;
    }
    return best;
  }

  // Distance segments (with labels) between two boxes, one per axis where a gap exists.
  function gapSegments(s: AbsBox, h: AbsBox): MeasureSeg[] {
    const segs: MeasureSeg[] = [];
    if (h.x >= s.x + s.w || s.x >= h.x + h.w) {
      const x1 = h.x >= s.x + s.w ? s.x + s.w : h.x + h.w;
      const x2 = h.x >= s.x + s.w ? h.x : s.x;
      const overlap = Math.max(0, Math.min(s.y + s.h, h.y + h.h) - Math.max(s.y, h.y));
      const yMid = overlap > 0 ? (Math.max(s.y, h.y) + Math.min(s.y + s.h, h.y + h.h)) / 2 : s.y + s.h / 2;
      segs.push({ x: Math.min(x1, x2), y: yMid, w: Math.abs(x2 - x1), h: 0, vertical: false, label: `${Math.round(Math.abs(x2 - x1))}` });
    }
    if (h.y >= s.y + s.h || s.y >= h.y + h.h) {
      const y1 = h.y >= s.y + s.h ? s.y + s.h : h.y + h.h;
      const y2 = h.y >= s.y + s.h ? h.y : s.y;
      const overlap = Math.max(0, Math.min(s.x + s.w, h.x + h.w) - Math.max(s.x, h.x));
      const xMid = overlap > 0 ? (Math.max(s.x, h.x) + Math.min(s.x + s.w, h.x + h.w)) / 2 : s.x + s.w / 2;
      segs.push({ x: xMid, y: Math.min(y1, y2), w: 0, h: Math.abs(y2 - y1), vertical: true, label: `${Math.round(Math.abs(y2 - y1))}` });
    }
    return segs;
  }

  function beginDrag(e: React.PointerEvent, node: Node, mode: DragState["mode"], handle?: HandleDir) {
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

    drag.current = { id: node.id, mode, handle, startX: e.clientX, startY: e.clientY, frame: { ...node.frame }, duplicate: mode === "move" && e.ctrlKey && e.shiftKey, moved: false, parentW, parentH, parentOX: po.x, parentOY: po.y, siblings, group };
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
        // Drag-into-frame reparenting: highlight the frame under the node's center.
        if (d.group.length === 1 && !d.duplicate) {
          const cx = d.parentOX + snapped.x + d.frame.w / 2;
          const cy = d.parentOY + snapped.y + d.frame.h / 2;
          const tgt = reparentTargetAt(cx, cy, d.id);
          const curParent = findParent(doc.root, d.id)?.id ?? doc.root.id;
          const eff = tgt !== curParent ? tgt : null;
          d.reparent = eff;
          if (eff !== reparentId) setReparentId(eff);
        } else if (d.reparent) {
          d.reparent = null;
          setReparentId(null);
        }
      } else {
        const k = d.handle ?? "se";
        let { x, y, w, h } = d.frame;
        if (k.includes("e")) w = d.frame.w + dx;
        if (k.includes("s")) h = d.frame.h + dy;
        if (k.includes("w")) { w = d.frame.w - dx; x = d.frame.x + dx; }
        if (k.includes("n")) { h = d.frame.h - dy; y = d.frame.y + dy; }
        if (w < 8) { if (k.includes("w")) x -= 8 - w; w = 8; }
        if (h < 8) { if (k.includes("n")) y -= 8 - h; h = 8; }
        let frame: Frame = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
        let guides: Guide[] = [];
        // Snapping latches the moving right/bottom edges (the classic SE drag).
        if (k === "se") {
          const snapped = snapResize({ ...d.frame, w: frame.w, h: frame.h }, d.siblings, parentBox);
          frame = { ...frame, w: snapped.w, h: snapped.h };
          guides = absolutize(snapped.guides, d);
        }
        onPatchFrames([{ id: d.id, frame }], first);
        setGuides(guides);
        setBadge({ x: d.parentOX + frame.x, y: d.parentOY + frame.y, text: `${frame.w} × ${frame.h}` });
      }
      return;
    }
    if (marquee.current) {
      const p = toStage(e.clientX, e.clientY);
      const m = marquee.current;
      setMarqueeRect({ x: Math.min(m.sx, p.x), y: Math.min(m.sy, p.y), w: Math.abs(p.x - m.sx), h: Math.abs(p.y - m.sy) });
      return;
    }
    // Alt-measure: with one node selected, hovering another shows the gap distances.
    if (e.altKey && selectedIds.length === 1) {
      const p = toStage(e.clientX, e.clientY);
      const sel = absBoxes(doc.root).find((b) => b.id === selectedIds[0]);
      const hov = nodeBoxAt(p.x, p.y, selectedIds[0]);
      if (sel && hov) {
        setMeasure(gapSegments(sel, hov));
        return;
      }
    }
    if (measure) setMeasure(null);
  }

  function absolutize(gs: Guide[], d: DragState): Guide[] {
    return gs.map((g) => ({ axis: g.axis, pos: g.axis === "x" ? d.parentOX + g.pos : d.parentOY + g.pos }));
  }

  function endDrag() {
    const d = drag.current;
    drag.current = null;
    setGuides([]);
    setBadge(null);
    setReparentId(null);
    if (d && d.reparent && d.moved && !d.duplicate) {
      onReparent(d.id, d.reparent);
    }
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

    // An Instance renders its resolved component content read-only; the instance
    // box itself is the selectable/draggable unit.
    if (node.type === "Instance") {
      const m = materializeInstance(doc, node);
      const outer: React.CSSProperties = {
        position: parentFlex ? "relative" : "absolute",
        ...(parentFlex ? {} : { left: node.frame.x, top: node.frame.y }),
        width: node.frame.w,
        height: node.frame.h,
        outline: selected ? "2px solid #7c3aed" : "1px dashed rgba(124,58,237,0.55)",
        outlineOffset: selected ? 0 : -1,
        cursor: node.locked ? "default" : "move",
      };
      return (
        <div
          key={node.id}
          style={outer}
          onPointerDown={node.locked ? undefined : (e) => beginDrag(e, node, "move")}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextNode(e, node.id); }}
        >
          {m ? (
            renderStatic({ ...m, frame: { x: 0, y: 0, w: node.frame.w, h: node.frame.h } }, false, doc.tokens)
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#b91c1c", fontSize: 12, textAlign: "center", background: "repeating-linear-gradient(45deg,#fef2f2,#fef2f2 8px,#fee2e2 8px,#fee2e2 16px)" }}>
              missing component
            </div>
          )}
          {selected && !node.locked && selectedIds.length === 1
            ? HANDLES.map((h) => <div key={h.key} onPointerDown={(e) => beginDrag(e, node, "resize", h.key)} style={handleStyle(h)} />)
            : null}
        </div>
      );
    }

    const flexContainer = isFlex(node);
    const hasChildren = (node.children?.length ?? 0) > 0;
    const editKey = editableTextKey(node.type);

    const style: React.CSSProperties = isRoot
      ? { position: "relative", width: doc.canvas.width, height: doc.canvas.height, background: doc.canvas.background, overflow: "hidden", ...(flexContainer ? layoutToFlexCss(node.layout) : {}) }
      : {
          ...nodeBoxStyle(node, doc.tokens),
          ...(parentFlex ? { position: "relative", left: "auto", top: "auto" } : {}),
          ...(flexContainer ? layoutToFlexCss(node.layout) : {}),
          outline: reparentId === node.id ? "2px solid #16a34a" : selected ? "2px solid #2563eb" : "1px solid rgba(0,0,0,0.06)",
          outlineOffset: selected || reparentId === node.id ? 0 : -1,
          cursor: node.locked ? "default" : "move",
          overflow: "hidden",
        };

    const inner = !flexContainer && !hasChildren ? nodeInner(node) : null;
    const innerJustify = node.style?.textAlign === "center" ? "center" : node.style?.textAlign === "right" ? "flex-end" : "flex-start";
    const fullBleed = node.type === "Image" || node.type === "Embed" || node.type === "ProgressBar" || node.type === "Avatar";
    const innerStyle: React.CSSProperties = fullBleed
      ? { pointerEvents: "none", position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit" }
      : { pointerEvents: "none", position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: innerJustify, padding: "0 4px", overflow: "hidden" };
    const isEditing = editing === node.id;

    return (
      <div
        key={node.id}
        style={style}
        onPointerDown={isRoot || isEditing ? undefined : (e) => beginDrag(e, node, "move")}
        onDoubleClick={isRoot || !editKey ? undefined : (e) => { e.stopPropagation(); onSelectOnly(node.id); setEditing(node.id); }}
        onContextMenu={isRoot ? undefined : (e) => { e.preventDefault(); e.stopPropagation(); onContextNode(e, node.id); }}
      >
        {inner != null && !isEditing && <div style={innerStyle}>{inner}</div>}
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
        {selected && !isRoot && !node.locked && selectedIds.length === 1
          ? HANDLES.map((h) => <div key={h.key} onPointerDown={(e) => beginDrag(e, node, "resize", h.key)} style={handleStyle(h)} />)
          : null}
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
          {measure?.map((m, i) => (
            <div key={`m${i}`}>
              <div style={{ position: "absolute", left: m.x, top: m.y, width: m.vertical ? 0 : m.w, height: m.vertical ? m.h : 0, borderTop: m.vertical ? undefined : "1px dashed #ef4444", borderLeft: m.vertical ? "1px dashed #ef4444" : undefined, pointerEvents: "none" }} />
              <div style={{ position: "absolute", left: m.vertical ? m.x : m.x + m.w / 2, top: m.vertical ? m.y + m.h / 2 : m.y, transform: "translate(-50%,-50%)", background: "#ef4444", color: "#fff", fontSize: 10, lineHeight: 1.4, padding: "1px 4px", borderRadius: 3, pointerEvents: "none", whiteSpace: "nowrap" }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
