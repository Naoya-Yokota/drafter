import { useState, useEffect, useRef } from "react";

type Props = {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  docColors?: string[];
};

const PALETTE = [
  "#000000", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#f3f4f6", "#ffffff", "#0f172a",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#2563eb", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#fecaca", "#fed7aa", "#fde68a", "#bbf7d0", "#bfdbfe", "#e9d5ff",
];

const GRADIENTS = [
  "linear-gradient(135deg, #667eea, #764ba2)",
  "linear-gradient(135deg, #f093fb, #f5576c)",
  "linear-gradient(135deg, #4facfe, #00f2fe)",
  "linear-gradient(135deg, #43e97b, #38f9d7)",
  "linear-gradient(135deg, #fa709a, #fee140)",
  "linear-gradient(135deg, #30cfd0, #330867)",
  "linear-gradient(135deg, #a8edea, #fed6e3)",
  "linear-gradient(180deg, #2563eb, #1e3a8a)",
];

// Recently used colors, shared across all ColorField instances this session.
const recent: string[] = [];
function pushRecent(c: string) {
  const i = recent.indexOf(c);
  if (i >= 0) recent.splice(i, 1);
  recent.unshift(c);
  if (recent.length > 8) recent.pop();
}

function asHex(v: string | undefined): string {
  return v && /^#[0-9a-f]{6}$/i.test(v) ? v : "#000000";
}

export function ColorField({ label, value, onChange, docColors = [] }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Element)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (c: string | undefined, andClose = false) => {
    if (c) pushRecent(c);
    onChange(c);
    if (andClose) setOpen(false);
  };

  const eyedropper = async () => {
    const Ed = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!Ed) {
      alert("お使いのブラウザはスポイト(EyeDropper)に未対応です（Chrome系で利用可）。");
      return;
    }
    try {
      const r = await new Ed().open();
      pick(r.sRGBHex, true);
    } catch {
      /* cancelled */
    }
  };

  const docOnly = docColors.filter((c) => !PALETTE.includes(c.toLowerCase()));

  return (
    <div className="row color-row" ref={ref}>
      <span>{label}</span>
      <div className="color-control">
        <button type="button" className="swatch" style={{ background: value || "transparent" }} title="クリックで色を選択" onClick={() => setOpen((o) => !o)}>
          {!value && <span className="swatch-none">∅</span>}
        </button>
        <input type="text" className="color-hex" value={value ?? ""} placeholder="none" onChange={(e) => onChange(e.target.value || undefined)} />
        {open && (
          <div className="color-pop">
            <div className="swatches">
              {PALETTE.map((c) => (
                <button key={c} type="button" className={`sw${value?.toLowerCase() === c ? " on" : ""}`} style={{ background: c }} title={c} onClick={() => pick(c, true)} />
              ))}
            </div>
            {recent.length > 0 && (
              <>
                <div className="color-pop-label">最近使った色</div>
                <div className="swatches">
                  {recent.map((c) => (
                    <button key={c} type="button" className="sw" style={{ background: c }} title={c} onClick={() => pick(c, true)} />
                  ))}
                </div>
              </>
            )}
            {docOnly.length > 0 && (
              <>
                <div className="color-pop-label">ドキュメントの色</div>
                <div className="swatches">
                  {docOnly.slice(0, 16).map((c) => (
                    <button key={c} type="button" className="sw" style={{ background: c }} title={c} onClick={() => pick(c, true)} />
                  ))}
                </div>
              </>
            )}
            <div className="color-pop-label">グラデーション</div>
            <div className="swatches grad">
              {GRADIENTS.map((g) => (
                <button key={g} type="button" className={`sw${value === g ? " on" : ""}`} style={{ background: g }} title="グラデーション" onClick={() => pick(g, true)} />
              ))}
            </div>
            <div className="color-pop-row">
              <input type="color" value={asHex(value)} onChange={(e) => pick(e.target.value)} />
              <button type="button" title="スポイト" onClick={eyedropper}>🔍 スポイト</button>
              <button type="button" onClick={() => pick(undefined, true)}>クリア</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
