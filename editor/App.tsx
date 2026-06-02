import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { Document, Frame, Node, NodeType, Style } from "../src/ir/schema.ts";
import { generateHtml } from "../src/codegen/html.ts";
import { loadDesign, saveDesign, aiResolve } from "./api.ts";
import {
  patchNode,
  removeNode,
  addChild,
  findNode,
  findParent,
  absoluteOrigin,
  makeNode,
  withRoot,
  cloneWithNewIds,
  reorder,
  groupNodes,
  ungroupNode,
  documentColors,
  editableTextKey,
  PALETTE,
  type ZOrderOp,
} from "./store.ts";
import { useHistory } from "./history.ts";
import { Canvas } from "./components/Canvas.tsx";
import { Inspector, type AlignEdge } from "./components/Inspector.tsx";
import { MultiInspector } from "./components/MultiInspector.tsx";
import { Tree } from "./components/Tree.tsx";
import { Preview } from "./components/Preview.tsx";
import { ContextMenu, type MenuState } from "./components/ContextMenu.tsx";
import { CommandPalette, type Command } from "./components/CommandPalette.tsx";
import { TEMPLATES } from "./templates.ts";

const CANVAS_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "モバイル", w: 390, h: 844 },
  { label: "タブレット", w: 768, h: 1024 },
  { label: "デスクトップ", w: 1440, h: 900 },
  { label: "ワイド", w: 1920, h: 1080 },
];

let commentCounter = 0;
function newCommentId(): string {
  commentCounter += 1;
  return `c_${Date.now().toString(36)}_${commentCounter}`;
}

function isEditingField(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export function App() {
  const { doc, canUndo, canRedo, reset, commit, replace, undo, redo } = useHistory();
  const [path, setPath] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string>("読み込み中…");
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showCanvas, setShowCanvas] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(440);
  const [zoom, setZoom] = useState(1);
  const centerRef = useRef<HTMLDivElement>(null);
  const splitting = useRef(false);
  const [menu, setMenu] = useState<MenuState>(null);
  const [showNew, setShowNew] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const clipboard = useRef<Node[]>([]);
  const styleClipboard = useRef<Style | null>(null);
  const [hasStyleClip, setHasStyleClip] = useState(false);

  const primaryId = selectedIds.length ? selectedIds[selectedIds.length - 1] : null;

  const selectOnly = useCallback((id: string | null) => setSelectedIds(id ? [id] : []), []);
  const toggleSelect = useCallback((id: string) => setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])), []);
  const selectMany = useCallback((ids: string[]) => setSelectedIds(ids), []);

  useEffect(() => {
    loadDesign()
      .then(({ doc, path }) => {
        reset(doc);
        setPath(path);
        setStatus(`読み込み完了: ${path}`);
      })
      .catch((e) => setStatus(`読み込み失敗: ${e.message}`));
  }, [reset]);

  const touch = useCallback(() => setDirty(true), []);

  const onPatch = useCallback(
    (id: string, patch: Partial<Node>) => {
      commit((cur) => withRoot(cur, patchNode(cur.root, id, patch)));
      touch();
    },
    [commit, touch],
  );

  const onPatchFrame = useCallback(
    (id: string, frame: Frame, commitStep = true) => {
      const apply = (cur: Document) => withRoot(cur, patchNode(cur.root, id, { frame }));
      if (commitStep) commit(apply);
      else replace(apply);
      touch();
    },
    [commit, replace, touch],
  );

  // Apply many frame updates as one history step (group move).
  const onPatchFrames = useCallback(
    (updates: { id: string; frame: Frame }[], commitStep = true) => {
      const apply = (cur: Document) => {
        let root = cur.root;
        for (const u of updates) root = patchNode(root, u.id, { frame: u.frame });
        return withRoot(cur, root);
      };
      if (commitStep) commit(apply);
      else replace(apply);
      touch();
    },
    [commit, replace, touch],
  );

  const onDelete = useCallback(
    (id: string) => {
      commit((cur) => (id === cur.root.id ? cur : withRoot(cur, removeNode(cur.root, id))));
      setSelectedIds((s) => s.filter((x) => x !== id));
      touch();
    },
    [commit, touch],
  );

  const onDeleteSelection = useCallback(() => {
    if (!doc) return;
    const ids = selectedIds.filter((id) => id !== doc.root.id);
    if (!ids.length) return;
    commit((cur) => {
      let root = cur.root;
      for (const id of ids) root = removeNode(root, id);
      return withRoot(cur, root);
    });
    setSelectedIds([]);
    touch();
  }, [doc, selectedIds, commit, touch]);

  const onAdd = useCallback(
    (type: NodeType) => {
      commit((cur) => {
        const target = primaryId ? findNode(cur.root, primaryId) : cur.root;
        const parent = target && target.type === "Frame" ? target : cur.root;
        const node = makeNode(type, { x: 24, y: 24 });
        setSelectedIds([node.id]);
        return withRoot(cur, addChild(cur.root, parent.id, node));
      });
      touch();
    },
    [commit, primaryId, touch],
  );

  const onZOrder = useCallback(
    (id: string, op: ZOrderOp) => {
      commit((cur) => withRoot(cur, reorder(cur.root, id, op)));
      touch();
    },
    [commit, touch],
  );

  const onPatchCanvas = useCallback(
    (patch: Partial<Document["canvas"]>) => {
      commit((cur) => {
        const canvas = { ...cur.canvas, ...patch };
        const root = { ...cur.root, frame: { ...cur.root.frame, w: canvas.width, h: canvas.height } };
        return { ...cur, canvas, root };
      });
      touch();
    },
    [commit, touch],
  );

  const insertClones = useCallback(
    (sources: { node: Node; parentId: string }[], offset: number) => {
      commit((cur) => {
        let root = cur.root;
        const newIds: string[] = [];
        for (const { node, parentId } of sources) {
          const copy = cloneWithNewIds(node);
          copy.frame = { ...copy.frame, x: copy.frame.x + offset, y: copy.frame.y + offset };
          newIds.push(copy.id);
          root = addChild(root, parentId, copy);
        }
        setSelectedIds(newIds);
        return withRoot(cur, root);
      });
      touch();
    },
    [commit, touch],
  );

  const onDuplicate = useCallback(
    (id: string) => {
      if (!doc) return;
      const node = findNode(doc.root, id);
      if (!node) return;
      const parent = findParent(doc.root, id) ?? doc.root;
      insertClones([{ node, parentId: parent.id }], 16);
    },
    [doc, insertClones],
  );

  const onDuplicateSelection = useCallback(() => {
    if (!doc) return;
    const sources = selectedIds
      .map((id) => {
        const node = findNode(doc.root, id);
        if (!node || id === doc.root.id) return null;
        return { node, parentId: (findParent(doc.root, id) ?? doc.root).id };
      })
      .filter(Boolean) as { node: Node; parentId: string }[];
    if (sources.length) insertClones(sources, 16);
  }, [doc, selectedIds, insertClones]);

  const onCopySelection = useCallback(() => {
    if (!doc) return;
    const nodes = selectedIds.map((id) => findNode(doc.root, id)).filter((n): n is Node => !!n && n.id !== doc.root.id);
    if (nodes.length) {
      clipboard.current = nodes;
      setStatus(`コピー: ${nodes.length}個`);
    }
  }, [doc, selectedIds]);

  const onPaste = useCallback(() => {
    if (!doc || !clipboard.current.length) return;
    const target = primaryId ? findNode(doc.root, primaryId) : doc.root;
    const parent = target && target.type === "Frame" ? target : doc.root;
    insertClones(clipboard.current.map((node) => ({ node, parentId: parent.id })), 16);
  }, [doc, primaryId, insertClones]);

  const onDuplicateDrop = useCallback(
    (id: string, original: Frame, _dropped: Frame) => {
      commit((cur) => {
        const node = findNode(cur.root, id);
        if (!node) return cur;
        const parent = findParent(cur.root, id) ?? cur.root;
        const copy = cloneWithNewIds(node);
        let next = addChild(cur.root, parent.id, copy);
        next = patchNode(next, id, { frame: original });
        setSelectedIds([copy.id]);
        return withRoot(cur, next);
      });
      touch();
    },
    [commit, touch],
  );

  // Align a single node within its parent's box.
  const onAlign = useCallback(
    (id: string, edge: AlignEdge) => {
      if (!doc) return;
      const node = findNode(doc.root, id);
      if (!node) return;
      const parent = findParent(doc.root, id);
      const root = !parent || parent.id === doc.root.id;
      const pw = root ? doc.canvas.width : parent.frame.w;
      const ph = root ? doc.canvas.height : parent.frame.h;
      const f = node.frame;
      const next: Frame = { ...f };
      if (edge === "left") next.x = 0;
      else if (edge === "hcenter") next.x = Math.round((pw - f.w) / 2);
      else if (edge === "right") next.x = pw - f.w;
      else if (edge === "top") next.y = 0;
      else if (edge === "vcenter") next.y = Math.round((ph - f.h) / 2);
      else if (edge === "bottom") next.y = ph - f.h;
      onPatchFrame(id, next);
    },
    [doc, onPatchFrame],
  );

  // Align the whole selection to the selection's bounding box.
  const onAlignSelection = useCallback(
    (edge: AlignEdge) => {
      if (!doc || selectedIds.length < 2) return;
      const items = selectedIds
        .map((id) => {
          const node = findNode(doc.root, id);
          if (!node) return null;
          const origin = absoluteOrigin(doc.root, id);
          const parent = findParent(doc.root, id);
          const po = !parent || parent.id === doc.root.id ? { x: 0, y: 0 } : absoluteOrigin(doc.root, parent.id);
          return { node, ax: origin.x, ay: origin.y, pox: po.x, poy: po.y };
        })
        .filter(Boolean) as { node: Node; ax: number; ay: number; pox: number; poy: number }[];
      if (items.length < 2) return;
      const left = Math.min(...items.map((i) => i.ax));
      const right = Math.max(...items.map((i) => i.ax + i.node.frame.w));
      const top = Math.min(...items.map((i) => i.ay));
      const bottom = Math.max(...items.map((i) => i.ay + i.node.frame.h));
      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;
      const updates = items.map((i) => {
        const f = i.node.frame;
        let ax = i.ax;
        let ay = i.ay;
        if (edge === "left") ax = left;
        else if (edge === "hcenter") ax = Math.round(cx - f.w / 2);
        else if (edge === "right") ax = right - f.w;
        else if (edge === "top") ay = top;
        else if (edge === "vcenter") ay = Math.round(cy - f.h / 2);
        else if (edge === "bottom") ay = bottom - f.h;
        return { id: i.node.id, frame: { ...f, x: Math.round(ax - i.pox), y: Math.round(ay - i.poy) } };
      });
      onPatchFrames(updates);
    },
    [doc, selectedIds, onPatchFrames],
  );

  // Distribute the selection evenly along an axis (even gaps, keeps order).
  const onDistributeSelection = useCallback(
    (axis: "h" | "v") => {
      if (!doc || selectedIds.length < 3) return;
      const items = selectedIds
        .map((id) => {
          const node = findNode(doc.root, id);
          if (!node) return null;
          const origin = absoluteOrigin(doc.root, id);
          const parent = findParent(doc.root, id);
          const po = !parent || parent.id === doc.root.id ? { x: 0, y: 0 } : absoluteOrigin(doc.root, parent.id);
          return { node, ax: origin.x, ay: origin.y, pox: po.x, poy: po.y };
        })
        .filter(Boolean) as { node: Node; ax: number; ay: number; pox: number; poy: number }[];
      if (items.length < 3) return;

      const size = (i: (typeof items)[number]) => (axis === "v" ? i.node.frame.h : i.node.frame.w);
      const pos = (i: (typeof items)[number]) => (axis === "v" ? i.ay : i.ax);
      const sorted = [...items].sort((a, b) => pos(a) - pos(b));
      const start = pos(sorted[0]);
      const end = pos(sorted[sorted.length - 1]) + size(sorted[sorted.length - 1]);
      const used = sorted.reduce((s, i) => s + size(i), 0);
      const gap = (end - start - used) / (sorted.length - 1);

      let cursor = start;
      const updates = sorted.map((i) => {
        const p = Math.round(cursor);
        cursor += size(i) + gap;
        const f = i.node.frame;
        return axis === "v"
          ? { id: i.node.id, frame: { ...f, y: p - i.poy } }
          : { id: i.node.id, frame: { ...f, x: p - i.pox } };
      });
      onPatchFrames(updates);
    },
    [doc, selectedIds, onPatchFrames],
  );

  const onGroup = useCallback(() => {
    if (selectedIds.length < 2) return;
    commit((cur) => {
      const res = groupNodes(cur.root, selectedIds);
      if (!res) return cur;
      setSelectedIds([res.groupId]);
      return withRoot(cur, res.root);
    });
    touch();
  }, [selectedIds, commit, touch]);

  const onUngroup = useCallback(
    (id: string) => {
      commit((cur) => {
        const res = ungroupNode(cur.root, id);
        if (!res) return cur;
        setSelectedIds(res.childIds);
        return withRoot(cur, res.root);
      });
      touch();
    },
    [commit, touch],
  );

  const onToggleLock = useCallback(
    (id: string) => {
      commit((cur) => {
        const n = findNode(cur.root, id);
        return withRoot(cur, patchNode(cur.root, id, { locked: !n?.locked }));
      });
      touch();
    },
    [commit, touch],
  );

  const onToggleHide = useCallback(
    (id: string) => {
      commit((cur) => {
        const n = findNode(cur.root, id);
        return withRoot(cur, patchNode(cur.root, id, { hidden: !n?.hidden }));
      });
      touch();
    },
    [commit, touch],
  );

  const onCopyStyle = useCallback(
    (id: string) => {
      if (!doc) return;
      const n = findNode(doc.root, id);
      if (n?.style) {
        styleClipboard.current = { ...n.style };
        setHasStyleClip(true);
        setStatus("スタイルをコピーしました");
      }
    },
    [doc],
  );

  const onPasteStyle = useCallback(
    (id: string) => {
      if (!styleClipboard.current) return;
      const style = styleClipboard.current;
      const ids = selectedIds.length > 1 && selectedIds.includes(id) ? selectedIds : [id];
      commit((cur) => {
        let root = cur.root;
        for (const nid of ids) root = patchNode(root, nid, { style: { ...style } });
        return withRoot(cur, root);
      });
      touch();
    },
    [selectedIds, commit, touch],
  );

  // Commit an inline (double-click) text edit to the right prop for the type.
  const onEditText = useCallback(
    (id: string, value: string) => {
      if (!doc) return;
      const n = findNode(doc.root, id);
      if (!n) return;
      const key = editableTextKey(n.type);
      if (!key) return;
      commit((cur) => withRoot(cur, patchNode(cur.root, id, { props: { ...(findNode(cur.root, id)?.props ?? {}), [key]: value } })));
      touch();
    },
    [doc, commit, touch],
  );

  // Comments.
  const onAddComment = useCallback(
    (id: string, text: string) => {
      commit((cur) => {
        const node = findNode(cur.root, id);
        const comments = [...(node?.comments ?? []), { id: newCommentId(), author: "user" as const, text, resolved: false }];
        return withRoot(cur, patchNode(cur.root, id, { comments }));
      });
      touch();
    },
    [commit, touch],
  );

  const onResolveComment = useCallback(
    (id: string, commentId: string, resolved: boolean) => {
      commit((cur) => {
        const node = findNode(cur.root, id);
        const comments = (node?.comments ?? []).map((c) => (c.id === commentId ? { ...c, resolved } : c));
        return withRoot(cur, patchNode(cur.root, id, { comments }));
      });
      touch();
    },
    [commit, touch],
  );

  const onAiResolve = useCallback(
    async (id: string) => {
      if (!doc) return;
      setBusy(true);
      setStatus("AIに修正を依頼中…（裏で claude を実行）");
      try {
        const updated = await aiResolve(doc, id);
        commit(() => updated);
        setDirty(true);
        setStatus("AIが design.json を更新しました（元に戻すで取り消せます）。");
      } catch (e) {
        setStatus(`AI修正に失敗: ${(e as Error).message}`);
      } finally {
        setBusy(false);
      }
    },
    [doc, commit],
  );

  const setPanels = useCallback((canvas: boolean, preview: boolean) => {
    if (!canvas && !preview) return;
    setShowCanvas(canvas);
    setShowPreview(preview);
  }, []);

  const onSplitMove = useCallback((e: React.PointerEvent) => {
    if (!splitting.current || !centerRef.current) return;
    const rect = centerRef.current.getBoundingClientRect();
    const w = rect.right - e.clientX;
    setPreviewWidth(Math.min(rect.width - 240, Math.max(240, w)));
  }, []);

  const onSave = useCallback(async () => {
    if (!doc) return;
    setStatus("保存中…");
    try {
      const saved = await saveDesign(doc);
      setDirty(false);
      setStatus(`保存しました → ${saved}`);
    } catch (e) {
      setStatus(`保存失敗: ${(e as Error).message}`);
    }
  }, [doc]);

  const onExport = useCallback(() => {
    if (!doc) return;
    const html = generateHtml(doc);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name || "design"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("HTMLを書き出しました。");
  }, [doc]);

  const onNewFromTemplate = useCallback(
    (templateId: string) => {
      const t = TEMPLATES.find((x) => x.id === templateId);
      if (!t) return;
      if (dirty && !window.confirm("未保存の変更があります。テンプレートで置き換えますか？")) return;
      reset(structuredClone(t.doc));
      setSelectedIds([]);
      setDirty(true);
      setStatus(`テンプレート: ${t.label}（Ctrl+Sで保存）`);
      setShowNew(false);
    },
    [dirty, reset],
  );

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave();
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        setDirty(true);
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        setDirty(true);
        return;
      }
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (isEditingField()) return;
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) {
          if (primaryId) onUngroup(primaryId);
        } else {
          onGroup();
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (doc) selectMany((doc.root.children ?? []).map((c) => c.id));
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        onCopySelection();
      } else if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        onPaste();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        onDuplicateSelection();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length) {
          e.preventDefault();
          onDeleteSelection();
        }
      } else if (selectedIds.length && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const updates = selectedIds
          .map((id) => {
            const n = doc && findNode(doc.root, id);
            return n ? { id, frame: { ...n.frame, x: n.frame.x + dx, y: n.frame.y + dy } } : null;
          })
          .filter(Boolean) as { id: string; frame: Frame }[];
        if (updates.length) onPatchFrames(updates);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, selectedIds, primaryId, onSave, onCopySelection, onPaste, onDuplicateSelection, onDeleteSelection, onPatchFrames, onGroup, onUngroup, undo, redo, selectMany]);

  if (!doc) return <div className="loading">{status}</div>;

  const primary = primaryId ? findNode(doc.root, primaryId) ?? null : null;
  const docColors = documentColors(doc.root);
  const menuNode = menu ? findNode(doc.root, menu.id) ?? null : null;

  const commands: Command[] = [
    ...PALETTE.flatMap((g) => g.types.map((t) => ({ id: `add-${t}`, label: `追加: ${t}`, hint: g.group, run: () => onAdd(t) }))),
    { id: "export", label: "HTMLを書き出し", run: onExport },
    { id: "save", label: "保存", hint: "Ctrl+S", run: onSave },
    { id: "group", label: "グループ化", hint: "Ctrl+G", run: onGroup },
    ...(primaryId ? [{ id: "ungroup", label: "グループ解除", hint: "Ctrl+Shift+G", run: () => onUngroup(primaryId) }] : []),
    { id: "undo", label: "元に戻す", hint: "Ctrl+Z", run: () => { undo(); setDirty(true); } },
    { id: "redo", label: "やり直し", hint: "Ctrl+Shift+Z", run: () => { redo(); setDirty(true); } },
    { id: "preview", label: showPreview ? "プレビューを隠す" : "プレビューを表示", run: () => setPanels(showCanvas, !showPreview) },
    ...(primaryId ? [{ id: "delete", label: "選択を削除", hint: "Del", run: onDeleteSelection }] : []),
  ];

  return (
    <div className="app">
      <header className="toolbar">
        <strong>Drafter</strong>
        <div className="menu-anchor">
          <button onClick={() => setShowNew((v) => !v)}>新規作成 ▾</button>
          {showNew && (
            <div className="dropdown" onPointerLeave={() => setShowNew(false)}>
              <div className="dropdown-label">テンプレートから</div>
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => onNewFromTemplate(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="menu-anchor">
          <button onClick={() => setShowAdd((v) => !v)}>＋追加 ▾</button>
          {showAdd && (
            <div className="dropdown palette" onPointerLeave={() => setShowAdd(false)}>
              {PALETTE.map((g) => (
                <div key={g.group}>
                  <div className="dropdown-label">{g.group}</div>
                  {g.types.map((t) => (
                    <button key={t} onClick={() => { onAdd(t); setShowAdd(false); }}>
                      {t}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <button disabled={!canUndo} title="元に戻す (Ctrl+Z)" onClick={() => { undo(); setDirty(true); }}>↶</button>
        <button disabled={!canRedo} title="やり直し (Ctrl+Shift+Z)" onClick={() => { redo(); setDirty(true); }}>↷</button>
        <span className="path">{path}</span>
        <div className="spacer" />
        <span className="add-label">画面:</span>
        <select
          className="size-select"
          value={CANVAS_PRESETS.find((p) => p.w === doc.canvas.width && p.h === doc.canvas.height)?.label ?? ""}
          onChange={(e) => {
            const p = CANVAS_PRESETS.find((x) => x.label === e.target.value);
            if (p) onPatchCanvas({ width: p.w, height: p.h });
          }}
        >
          <option value="">カスタム</option>
          {CANVAS_PRESETS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label} ({p.w}×{p.h})
            </option>
          ))}
        </select>
        <input className="size-num" type="number" value={doc.canvas.width} onChange={(e) => onPatchCanvas({ width: Math.max(1, Number(e.target.value)) })} />
        <span className="size-x">×</span>
        <input className="size-num" type="number" value={doc.canvas.height} onChange={(e) => onPatchCanvas({ height: Math.max(1, Number(e.target.value)) })} />
        <span className="add-label">ズーム:</span>
        <select className="size-select" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
          {[0.25, 0.5, 0.75, 1, 1.5, 2].map((z) => (
            <option key={z} value={z}>{Math.round(z * 100)}%</option>
          ))}
        </select>
        <span className="seg-label">表示:</span>
        <div className="seg">
          <button className={showCanvas ? "on" : ""} onClick={() => setPanels(!showCanvas, showPreview)}>編集</button>
          <button className={showPreview ? "on" : ""} onClick={() => setPanels(showCanvas, !showPreview)}>プレビュー</button>
        </div>
        <button onClick={onExport}>HTML書き出し</button>
        <button className="primary" onClick={onSave}>
          {dirty ? "● 保存 (Ctrl+S)" : "保存済み"}
        </button>
      </header>

      <div className="body">
        <aside className="left">
          <h4>レイヤー</h4>
          <Tree
            root={doc.root}
            selectedIds={selectedIds}
            onSelect={(id, additive) => (additive ? toggleSelect(id) : selectOnly(id))}
            onContext={(e, id) => { if (!selectedIds.includes(id)) selectOnly(id); setMenu({ x: e.clientX, y: e.clientY, id }); }}
            onToggleLock={onToggleLock}
            onToggleHide={onToggleHide}
          />
        </aside>

        <main className="center" ref={centerRef}>
          {showCanvas && (
            <section className="stage-wrap">
              <Canvas
                doc={doc}
                zoom={zoom}
                selectedIds={selectedIds}
                onSelectOnly={selectOnly}
                onToggleSelect={toggleSelect}
                onSelectMany={selectMany}
                onPatchFrames={onPatchFrames}
                onDuplicateDrop={onDuplicateDrop}
                onContextNode={(e, id) => { if (!selectedIds.includes(id)) selectOnly(id); setMenu({ x: e.clientX, y: e.clientY, id }); }}
                onEditText={onEditText}
                onZoom={setZoom}
              />
            </section>
          )}
          {showCanvas && showPreview && (
            <div
              className="splitter"
              onPointerDown={(e) => { splitting.current = true; (e.target as Element).setPointerCapture(e.pointerId); }}
              onPointerMove={onSplitMove}
              onPointerUp={() => (splitting.current = false)}
            />
          )}
          {showPreview && (
            <section className="preview-wrap" style={showCanvas ? { flex: `0 0 ${previewWidth}px` } : { flex: 1 }}>
              <div className="panel-title">HTML プレビュー (codegen 出力・AI不使用)</div>
              <Preview doc={doc} />
            </section>
          )}
        </main>

        <aside className="right">
          {selectedIds.length > 1 ? (
            <MultiInspector count={selectedIds.length} onAlignSelection={onAlignSelection} onDistributeSelection={onDistributeSelection} onDeleteSelection={onDeleteSelection} />
          ) : (
            <Inspector
              node={primary}
              busy={busy}
              docColors={docColors}
              onPatch={onPatch}
              onDelete={onDelete}
              onAlign={onAlign}
              onAddComment={onAddComment}
              onResolveComment={onResolveComment}
              onAiResolve={onAiResolve}
            />
          )}
        </aside>
      </div>

      <footer className="statusbar">{status}</footer>

      <ContextMenu
        menu={menu}
        node={menuNode}
        selectionCount={selectedIds.length}
        hasStyleClipboard={hasStyleClip}
        onClose={() => setMenu(null)}
        onZOrder={onZOrder}
        onDuplicate={onDuplicate}
        onCopy={(id) => {
          const n = findNode(doc.root, id);
          if (n && n.id !== doc.root.id) {
            clipboard.current = [n];
            setStatus("コピー: 1個");
          }
        }}
        onDelete={(id) => (selectedIds.length > 1 && selectedIds.includes(id) ? onDeleteSelection() : onDelete(id))}
        onGroup={onGroup}
        onUngroup={onUngroup}
        onToggleLock={onToggleLock}
        onToggleHide={onToggleHide}
        onCopyStyle={onCopyStyle}
        onPasteStyle={onPasteStyle}
      />

      <CommandPalette open={paletteOpen} commands={commands} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
