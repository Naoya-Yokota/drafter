import type { Document, Node, NodeType, Props, ComponentDef } from "../src/ir/schema.ts";

/** Which prop a node's on-canvas double-click edits, or null if not editable. */
const TEXT_PROP_KEY: Partial<Record<NodeType, keyof Props>> = {
  Text: "text",
  Button: "label",
  Link: "text",
  Badge: "text",
  Input: "placeholder",
  Checkbox: "label",
  Switch: "label",
  Accordion: "title",
};

export function editableTextKey(type: NodeType): keyof Props | null {
  return TEXT_PROP_KEY[type] ?? null;
}

/**
 * Pure, immutable helpers for editing the IR tree. Every function returns a new
 * Document/Node so React state updates stay predictable. No AI, no codegen here
 * — just the GUI's direct path into design.json.
 */

export function findNode(node: Node, id: string): Node | undefined {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const hit = findNode(c, id);
    if (hit) return hit;
  }
  return undefined;
}

/** Apply a shallow patch to the node with `id`, returning a new tree. */
export function patchNode(node: Node, id: string, patch: Partial<Node>): Node {
  if (node.id === id) return { ...node, ...patch };
  if (!node.children) return node;
  return { ...node, children: node.children.map((c) => patchNode(c, id, patch)) };
}

/** Remove the node with `id` (root cannot be removed), returning a new tree. */
export function removeNode(node: Node, id: string): Node {
  if (!node.children) return node;
  const kept = node.children.filter((c) => c.id !== id).map((c) => removeNode(c, id));
  return { ...node, children: kept };
}

/** Append a child to the node with `parentId`, returning a new tree. */
export function addChild(node: Node, parentId: string, child: Node): Node {
  if (node.id === parentId) {
    return { ...node, children: [...(node.children ?? []), child] };
  }
  if (!node.children) return node;
  return { ...node, children: node.children.map((c) => addChild(c, parentId, child)) };
}

/** Absolute top-left of a node within the canvas (root counts as origin 0,0). */
export function absoluteOrigin(root: Node, id: string): { x: number; y: number } {
  if (id === root.id) return { x: 0, y: 0 };
  const dfs = (node: Node, ox: number, oy: number): { x: number; y: number } | null => {
    const nx = ox + node.frame.x;
    const ny = oy + node.frame.y;
    if (node.id === id) return { x: nx, y: ny };
    for (const c of node.children ?? []) {
      const hit = dfs(c, nx, ny);
      if (hit) return hit;
    }
    return null;
  };
  for (const c of root.children ?? []) {
    const hit = dfs(c, 0, 0);
    if (hit) return hit;
  }
  return { x: 0, y: 0 };
}

export type AbsBox = { id: string; x: number; y: number; w: number; h: number };

/** Absolute boxes of every node except the root (for marquee/group math). */
export function absBoxes(root: Node): AbsBox[] {
  const out: AbsBox[] = [];
  const dfs = (node: Node, ox: number, oy: number) => {
    for (const c of node.children ?? []) {
      const x = ox + c.frame.x;
      const y = oy + c.frame.y;
      out.push({ id: c.id, x, y, w: c.frame.w, h: c.frame.h });
      dfs(c, x, y);
    }
  };
  dfs(root, 0, 0);
  return out;
}

/** Find the parent of `id`, or undefined for the root. */
export function findParent(node: Node, id: string): Node | undefined {
  for (const c of node.children ?? []) {
    if (c.id === id) return node;
    const hit = findParent(c, id);
    if (hit) return hit;
  }
  return undefined;
}

let counter = 0;
function freshId(type: string): string {
  counter += 1;
  return `${type.toLowerCase()}_${Date.now().toString(36)}_${counter}`;
}

/** Deep clone a node, assigning fresh ids to it and every descendant. */
export function cloneWithNewIds(node: Node): Node {
  return {
    ...node,
    id: freshId(node.type),
    style: node.style ? { ...node.style } : undefined,
    props: node.props ? { ...node.props } : undefined,
    frame: { ...node.frame },
    comments: node.comments ? node.comments.map((c) => ({ ...c })) : undefined,
    children: node.children ? node.children.map(cloneWithNewIds) : undefined,
  };
}

export type ZOrderOp = "front" | "forward" | "backward" | "back";

/** Move a node among its siblings (z-order = paint order for absolute boxes). */
export function reorder(node: Node, id: string, op: ZOrderOp): Node {
  if (node.children?.some((c) => c.id === id)) {
    const kids = [...node.children];
    const i = kids.findIndex((c) => c.id === id);
    const [item] = kids.splice(i, 1);
    const j =
      op === "front" ? kids.length : op === "back" ? 0 : op === "forward" ? Math.min(kids.length, i + 1) : Math.max(0, i - 1);
    kids.splice(j, 0, item);
    return { ...node, children: kids };
  }
  if (!node.children) return node;
  return { ...node, children: node.children.map((c) => reorder(c, id, op)) };
}

const DEFAULTS: Record<NodeType, Partial<Node>> = {
  Frame: { style: { background: "#eef2ff", border: "1px dashed #6366f1", borderRadius: 8 } },
  Text: { props: { text: "テキスト" }, style: { fontSize: 16, color: "#111827" } },
  Button: {
    props: { label: "ボタン", variant: "primary" },
    style: { background: "#2563eb", color: "#ffffff", borderRadius: 8, border: "none", fontSize: 16 },
  },
  Image: { props: { src: "", alt: "" }, style: { background: "#e5e7eb" } },
  Input: {
    props: { placeholder: "入力", inputType: "text" },
    style: { border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16, background: "#ffffff" },
  },
  Rectangle: { style: { background: "#93c5fd", borderRadius: 4 } },
  Link: { props: { text: "リンク", href: "#" }, style: { color: "#2563eb", fontSize: 16 } },
  Textarea: {
    props: { placeholder: "テキストを入力" },
    style: { border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16, background: "#ffffff" },
  },
  Checkbox: { props: { label: "チェック項目", checked: false }, style: { fontSize: 16, color: "#111827" } },
  Switch: { props: { label: "オン/オフ", checked: false }, style: { fontSize: 16, color: "#111827" } },
  Select: {
    props: { options: ["選択肢 1", "選択肢 2", "選択肢 3"] },
    style: { border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16, background: "#ffffff" },
  },
  Divider: { style: { background: "#e5e7eb" } },
  Badge: { props: { text: "NEW" }, style: { background: "#e0e7ff", color: "#3730a3", fontSize: 12 } },
  Avatar: { props: { text: "User" }, style: { background: "#c7d2fe" } },
  List: { props: { items: ["項目 1", "項目 2", "項目 3"] }, style: { fontSize: 16, color: "#111827" } },
  Accordion: {
    props: { title: "詳細を見る", body: "ここに開閉する内容が入ります。" },
    style: { border: "1px solid #e5e7eb", borderRadius: 8, background: "#ffffff", color: "#111827" },
  },
  NavBar: {
    props: { title: "Brand", items: ["ホーム", "機能", "料金", "お問い合わせ"], collapsible: true },
    style: { background: "#111827", color: "#ffffff", fontSize: 15 },
  },
  Embed: {
    props: { src: "https://www.openstreetmap.org/export/embed.html?bbox=139.69,35.68,139.71,35.70&layer=mapnik", title: "地図" },
    style: { borderRadius: 12, border: "1px solid #e5e7eb" },
  },
  Icon: { props: { text: "★" }, style: { fontSize: 32, color: "#2563eb" } },
  ProgressBar: { props: { value: 60 }, style: { background: "#e5e7eb", borderRadius: 999 } },
  Instance: {}, // created from a selection via createComponentFromSelection, not the palette
};

const DEFAULT_SIZE: Record<NodeType, { w: number; h: number }> = {
  Frame: { w: 240, h: 180 },
  Text: { w: 200, h: 28 },
  Button: { w: 160, h: 48 },
  Input: { w: 240, h: 48 },
  Image: { w: 160, h: 120 },
  Rectangle: { w: 160, h: 120 },
  Link: { w: 120, h: 24 },
  Textarea: { w: 280, h: 100 },
  Checkbox: { w: 200, h: 28 },
  Switch: { w: 160, h: 28 },
  Select: { w: 240, h: 44 },
  Divider: { w: 280, h: 2 },
  Badge: { w: 64, h: 24 },
  Avatar: { w: 48, h: 48 },
  List: { w: 240, h: 110 },
  Accordion: { w: 320, h: 52 },
  NavBar: { w: 390, h: 56 },
  Embed: { w: 320, h: 220 },
  Icon: { w: 48, h: 48 },
  ProgressBar: { w: 240, h: 10 },
  Instance: { w: 200, h: 120 }, // overridden by the component's natural size on creation
};

/** Component palette grouped for the toolbar's add menu. */
export const PALETTE: { group: string; types: NodeType[] }[] = [
  { group: "基本", types: ["Frame", "Text", "Button", "Image", "Rectangle", "Icon"] },
  { group: "フォーム", types: ["Input", "Textarea", "Select", "Checkbox", "Switch"] },
  { group: "表示", types: ["Link", "Badge", "Avatar", "Divider", "List", "ProgressBar"] },
  { group: "ナビ/開閉", types: ["NavBar", "Accordion"] },
  { group: "メディア/埋込", types: ["Embed"] },
];

export function makeNode(type: NodeType, at: { x: number; y: number }): Node {
  const base = DEFAULTS[type];
  const size = DEFAULT_SIZE[type];
  return {
    id: freshId(type),
    type,
    name: type,
    frame: { x: at.x, y: at.y, w: size.w, h: size.h },
    ...base,
  } as Node;
}

export function withRoot(doc: Document, root: Node): Document {
  return { ...doc, root };
}

/** All distinct colors used in the document (for the palette's "document" row). */
export function documentColors(root: Node): string[] {
  const set = new Set<string>();
  for (const n of walk(root)) {
    const s = n.style;
    if (s?.background) set.add(s.background);
    if (s?.color) set.add(s.color);
  }
  return [...set].filter((c) => /^#|rgb|hsl/i.test(c));
}

function* walk(node: Node): Generator<Node> {
  yield node;
  for (const c of node.children ?? []) yield* walk(c);
}

/** The shared parent of all ids, or the root if they differ. */
function commonParent(root: Node, ids: string[]): Node {
  const parents = ids.map((id) => findParent(root, id)?.id ?? root.id);
  const first = parents[0];
  return parents.every((p) => p === first) ? findNode(root, first) ?? root : root;
}

/** Wrap the given nodes in a new Frame (group). Returns the new tree + group id. */
export function groupNodes(root: Node, ids: string[]): { root: Node; groupId: string } | null {
  const real = ids.filter((id) => id !== root.id && findNode(root, id));
  if (real.length < 2) return null;
  const parent = commonParent(root, real);
  const po = absoluteOrigin(root, parent.id);
  // positions relative to the chosen parent
  const items = real.map((id) => {
    const n = findNode(root, id)!;
    const o = absoluteOrigin(root, id);
    return { node: n, x: o.x - po.x, y: o.y - po.y };
  });
  const minX = Math.min(...items.map((i) => i.x));
  const minY = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.node.frame.w));
  const maxY = Math.max(...items.map((i) => i.y + i.node.frame.h));
  const group: Node = {
    id: freshId("Group"),
    type: "Frame",
    name: "Group",
    frame: { x: Math.round(minX), y: Math.round(minY), w: Math.round(maxX - minX), h: Math.round(maxY - minY) },
    children: items.map((i) => ({ ...i.node, frame: { ...i.node.frame, x: Math.round(i.x - minX), y: Math.round(i.y - minY) } })),
  };
  let next = root;
  for (const id of real) next = removeNode(next, id);
  next = addChild(next, parent.id, group);
  return { root: next, groupId: group.id };
}

/** Replace the node with `id` in-place (preserving sibling order). */
export function replaceNode(node: Node, id: string, repl: Node): Node {
  if (!node.children) return node;
  return { ...node, children: node.children.map((c) => (c.id === id ? repl : replaceNode(c, id, repl))) };
}

let compCounter = 0;
function freshComponentId(): string {
  compCounter += 1;
  return `comp_${Date.now().toString(36)}_${compCounter}`;
}

/**
 * Turn the current selection into a reusable component definition and replace it
 * with an Instance of that component. A single node becomes the component root
 * directly; multiple nodes are wrapped in a Frame at their bounding box. Inner
 * ids are KEPT (not regenerated) so per-instance overrides can key on them.
 */
export function createComponentFromSelection(
  doc: Document,
  ids: string[],
): { doc: Document; instanceId: string; componentId: string } | null {
  const real = ids.filter((id) => id !== doc.root.id && findNode(doc.root, id));
  if (real.length === 0) return null;
  const componentId = freshComponentId();
  const instanceId = freshId("Instance");

  if (real.length === 1) {
    const node = findNode(doc.root, real[0])!;
    const name = node.name ?? node.type;
    const compRoot: Node = { ...structuredClone(node), frame: { x: 0, y: 0, w: node.frame.w, h: node.frame.h } };
    const instance: Node = { id: instanceId, type: "Instance", name, componentId, frame: { ...node.frame } };
    const def: ComponentDef = { name, root: compRoot };
    return {
      doc: { ...doc, components: { ...(doc.components ?? {}), [componentId]: def }, root: replaceNode(doc.root, real[0], instance) },
      instanceId,
      componentId,
    };
  }

  // Multiple: wrap at the bounding box within the nodes' common parent.
  const parent = commonParent(doc.root, real);
  const po = absoluteOrigin(doc.root, parent.id);
  const items = real.map((id) => {
    const n = findNode(doc.root, id)!;
    const o = absoluteOrigin(doc.root, id);
    return { node: n, x: o.x - po.x, y: o.y - po.y };
  });
  const minX = Math.min(...items.map((i) => i.x));
  const minY = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.node.frame.w));
  const maxY = Math.max(...items.map((i) => i.y + i.node.frame.h));
  const w = Math.round(maxX - minX);
  const h = Math.round(maxY - minY);
  const name = "Component";
  const compRoot: Node = {
    id: `${componentId}_root`,
    type: "Frame",
    name,
    frame: { x: 0, y: 0, w, h },
    children: items.map((i) => ({ ...structuredClone(i.node), frame: { ...i.node.frame, x: Math.round(i.x - minX), y: Math.round(i.y - minY) } })),
  };
  const instance: Node = { id: instanceId, type: "Instance", name, componentId, frame: { x: Math.round(minX), y: Math.round(minY), w, h } };
  let root = doc.root;
  for (const id of real) root = removeNode(root, id);
  root = addChild(root, parent.id, instance);
  return { doc: { ...doc, components: { ...(doc.components ?? {}), [componentId]: { name, root: compRoot } }, root }, instanceId, componentId };
}

/** Place a fresh Instance of a component at `at`, sized to its natural size. */
export function placeInstance(doc: Document, componentId: string, at: { x: number; y: number }): { node: Node } | null {
  const def = doc.components?.[componentId];
  if (!def) return null;
  const node: Node = {
    id: freshId("Instance"),
    type: "Instance",
    name: def.name,
    componentId,
    frame: { x: at.x, y: at.y, w: def.root.frame.w, h: def.root.frame.h },
  };
  return { node };
}

/**
 * Move `id` under `newParentId`, converting its frame so it stays put on screen.
 * Returns null if the move is invalid (into itself, a descendant, or unknown).
 */
export function reparentNode(root: Node, id: string, newParentId: string): Node | null {
  if (id === root.id || id === newParentId) return null;
  const node = findNode(root, id);
  const newParent = findNode(root, newParentId);
  if (!node || !newParent) return null;
  if (findParent(root, id)?.id === newParentId) return null; // already there
  if (findNode(node, newParentId)) return null; // would create a cycle
  const an = absoluteOrigin(root, id);
  const ap = absoluteOrigin(root, newParentId);
  const moved: Node = { ...node, frame: { ...node.frame, x: Math.round(an.x - ap.x), y: Math.round(an.y - ap.y) } };
  return addChild(removeNode(root, id), newParentId, moved);
}

/** Dissolve a group Frame, lifting its children into its parent. */
export function ungroupNode(root: Node, id: string): { root: Node; childIds: string[] } | null {
  const group = findNode(root, id);
  const parent = findParent(root, id);
  if (!group || !group.children?.length || !parent) return null;
  const lifted = group.children.map((c) => ({
    ...c,
    frame: { ...c.frame, x: group.frame.x + c.frame.x, y: group.frame.y + c.frame.y },
  }));
  let next = removeNode(root, id);
  for (const child of lifted) next = addChild(next, parent.id, child);
  return { root: next, childIds: lifted.map((c) => c.id) };
}
