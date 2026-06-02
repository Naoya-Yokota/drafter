import { useEffect } from "react";
import type { Node } from "../../src/ir/schema.ts";
import type { ZOrderOp } from "../store.ts";

export type MenuState = { x: number; y: number; id: string } | null;

type Props = {
  menu: MenuState;
  node: Node | null;
  selectionCount: number;
  hasStyleClipboard: boolean;
  onClose: () => void;
  onZOrder: (id: string, op: ZOrderOp) => void;
  onDuplicate: (id: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  onGroup: () => void;
  onUngroup: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleHide: (id: string) => void;
  onCopyStyle: (id: string) => void;
  onPasteStyle: (id: string) => void;
};

export function ContextMenu(p: Props) {
  const { menu, onClose } = p;
  useEffect(() => {
    if (!menu) return;
    const close = () => onClose();
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, onClose]);

  if (!menu) return null;
  const { id } = menu;
  const node = p.node;
  const isGroup = !!node && node.type === "Frame" && (node.children?.length ?? 0) > 0;
  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
    onClose();
  };

  return (
    <div className="ctxmenu" style={{ left: menu.x, top: menu.y }} onPointerDown={(e) => e.stopPropagation()}>
      <button onClick={run(() => p.onZOrder(id, "front"))}>最前面へ</button>
      <button onClick={run(() => p.onZOrder(id, "forward"))}>前面へ</button>
      <button onClick={run(() => p.onZOrder(id, "backward"))}>背面へ</button>
      <button onClick={run(() => p.onZOrder(id, "back"))}>最背面へ</button>
      <div className="ctx-sep" />
      {p.selectionCount > 1 && <button onClick={run(p.onGroup)}>グループ化 <span className="ctx-key">Ctrl+G</span></button>}
      {isGroup && <button onClick={run(() => p.onUngroup(id))}>グループ解除 <span className="ctx-key">Ctrl+Shift+G</span></button>}
      <button onClick={run(() => p.onCopyStyle(id))}>スタイルをコピー</button>
      {p.hasStyleClipboard && <button onClick={run(() => p.onPasteStyle(id))}>スタイルを貼り付け</button>}
      <div className="ctx-sep" />
      <button onClick={run(() => p.onCopy(id))}>コピー <span className="ctx-key">Ctrl+C</span></button>
      <button onClick={run(() => p.onDuplicate(id))}>複製 <span className="ctx-key">Ctrl+D</span></button>
      <button onClick={run(() => p.onToggleLock(id))}>{node?.locked ? "ロック解除" : "ロック"}</button>
      <button onClick={run(() => p.onToggleHide(id))}>{node?.hidden ? "表示" : "非表示"}</button>
      <div className="ctx-sep" />
      <button className="ctx-danger" onClick={run(() => p.onDelete(id))}>削除 <span className="ctx-key">Del</span></button>
    </div>
  );
}
