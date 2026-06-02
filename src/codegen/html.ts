import type { Document, Node, Style } from "../ir/schema.ts";

/**
 * HTML code generator: IR -> a standalone HTML string.
 *
 * MVP strategy: every node is absolutely positioned inside a relative
 * container, exactly mirroring the GUI canvas. This is the most faithful
 * "what you see is what you get" mapping. A future flex generator can read
 * node.layout instead.
 *
 * Generated regions are wrapped in BEGIN/END markers so that, later, we can
 * re-generate without clobbering hand-written code outside the markers.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function styleToCss(style: Style | undefined, extra: Record<string, string>): string {
  const out: Record<string, string> = { ...extra };
  if (style) {
    if (style.background) out["background"] = style.background;
    if (style.color) out["color"] = style.color;
    if (style.fontSize != null) out["font-size"] = `${style.fontSize}px`;
    if (style.fontWeight != null) out["font-weight"] = String(style.fontWeight);
    if (style.fontFamily) out["font-family"] = style.fontFamily;
    if (style.textAlign) out["text-align"] = style.textAlign;
    if (style.borderRadius != null) out["border-radius"] = `${style.borderRadius}px`;
    if (style.border) out["border"] = style.border;
    if (style.opacity != null) out["opacity"] = String(style.opacity);
    if (style.shadow) out["box-shadow"] = style.shadow;
  }
  return Object.entries(out)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}

function positionCss(node: Node): Record<string, string> {
  const f = node.frame;
  return {
    position: "absolute",
    left: `${f.x}px`,
    top: `${f.y}px`,
    width: `${f.w}px`,
    height: `${f.h}px`,
  };
}

function renderNode(node: Node, depth: number): string {
  const pad = "  ".repeat(depth);
  const css = styleToCss(node.style, positionCss(node));
  const idAttr = ` id="${esc(node.id)}"`;
  const styleAttr = ` style="${esc(css)}"`;
  const childHtml = (node.children ?? [])
    .map((c) => renderNode(c, depth + 1))
    .join("\n");
  const inner = childHtml ? `\n${childHtml}\n${pad}` : "";

  switch (node.type) {
    case "Button": {
      const label = esc(node.props?.label ?? "");
      return `${pad}<button${idAttr}${styleAttr}>${label}${inner}</button>`;
    }
    case "Text": {
      const text = esc(node.props?.text ?? "");
      return `${pad}<p${idAttr}${styleAttr}>${text}${inner}</p>`;
    }
    case "Image": {
      const src = esc(node.props?.src ?? "");
      const alt = esc(node.props?.alt ?? "");
      return `${pad}<img${idAttr}${styleAttr} src="${src}" alt="${alt}" />`;
    }
    case "Input": {
      const ph = esc(node.props?.placeholder ?? "");
      const t = esc(node.props?.inputType ?? "text");
      return `${pad}<input${idAttr}${styleAttr} type="${t}" placeholder="${ph}" />`;
    }
    case "Frame":
    case "Rectangle":
    default:
      return `${pad}<div${idAttr}${styleAttr}>${inner}</div>`;
  }
}

export function generateHtml(doc: Document): string {
  const c = doc.canvas;
  const rootCss = styleToCss(undefined, {
    position: "relative",
    width: `${c.width}px`,
    height: `${c.height}px`,
    background: c.background,
    margin: "0 auto",
    overflow: "hidden",
  });
  const body = renderNode(doc.root, 3);
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(doc.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f4f5; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <!-- DRAFTER:BEGIN generated from ${esc(doc.name)} (do not edit inside markers) -->
  <div class="drafter-canvas" style="${esc(rootCss)}">
${body}
  </div>
  <!-- DRAFTER:END -->
</body>
</html>
`;
}
