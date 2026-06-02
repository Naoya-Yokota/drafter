import { useState, useEffect, useRef, useMemo } from "react";

export type Command = { id: string; label: string; hint?: string; run: () => void };

type Props = {
  open: boolean;
  commands: Command[];
  onClose: () => void;
};

/** Ctrl+K command palette: type to filter, Enter to run. */
export function CommandPalette({ open, commands, onClose }: Props) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(t) || c.hint?.toLowerCase().includes(t));
  }, [q, commands]);

  if (!open) return null;

  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };

  return (
    <div className="palette-overlay" onPointerDown={onClose}>
      <div className="palette-modal" onPointerDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="コマンドを検索…（追加、整列、書き出し など）"
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter") { e.preventDefault(); run(filtered[active]); }
            else if (e.key === "Escape") onClose();
          }}
        />
        <div className="palette-list">
          {filtered.length === 0 && <div className="palette-empty">該当なし</div>}
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className={`palette-item${i === active ? " active" : ""}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => run(c)}
            >
              <span>{c.label}</span>
              {c.hint && <span className="palette-hint">{c.hint}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
