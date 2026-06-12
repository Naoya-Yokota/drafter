import type { Document, Node, Style, Tokens } from "../ir/schema.ts";
import { resolveColorToCss, tokenRootCss } from "../ir/tokens.ts";
import { materializeInstance } from "../ir/instance.ts";

/** Per-render context threaded through the recursion (component lookup + tokens). */
type Ctx = { doc: Document; tokens?: Tokens };

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

function styleToCss(style: Style | undefined, extra: Record<string, string>, tokens?: Tokens): string {
  const out: Record<string, string> = { ...extra };
  if (style) {
    if (style.background) out["background"] = resolveColorToCss(style.background, tokens)!;
    if (style.color) out["color"] = resolveColorToCss(style.color, tokens)!;
    if (style.fontSize != null) out["font-size"] = `${style.fontSize}px`;
    if (style.fontWeight != null) out["font-weight"] = String(style.fontWeight);
    if (style.fontFamily) out["font-family"] = style.fontFamily;
    if (style.textAlign) out["text-align"] = style.textAlign;
    if (style.borderRadius != null) out["border-radius"] = `${style.borderRadius}px`;
    if (style.border) out["border"] = resolveColorToCss(style.border, tokens)!;
    if (style.opacity != null) out["opacity"] = String(style.opacity);
    if (style.shadow) out["box-shadow"] = style.shadow;
    if (style.overflow) out["overflow"] = style.overflow;
    if (style.padding != null) out["padding"] = `${style.padding}px`;
    if (style.lineHeight != null) out["line-height"] = String(style.lineHeight);
    if (style.letterSpacing != null) out["letter-spacing"] = `${style.letterSpacing}px`;
    if (style.backdrop) out["backdrop-filter"] = style.backdrop;
  }
  return Object.entries(out)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}

function positionCss(node: Node, parentFlex: boolean): Record<string, string> {
  const f = node.frame;
  // Inside a flex parent the child flows; its x/y are ignored, size is a hint.
  if (parentFlex) return { position: "relative", width: `${f.w}px`, height: `${f.h}px` };
  return {
    position: "absolute",
    left: `${f.x}px`,
    top: `${f.y}px`,
    width: `${f.w}px`,
    height: `${f.h}px`,
  };
}

const FLEX_ALIGN: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
const FLEX_JUSTIFY: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between" };

function flexContainerCss(layout: Node["layout"]): Record<string, string> {
  if (!layout || layout.mode !== "flex") return {};
  const out: Record<string, string> = {
    display: "flex",
    "flex-direction": layout.direction === "column" ? "column" : "row",
  };
  if (layout.gap != null) out["gap"] = `${layout.gap}px`;
  if (layout.padding != null) out["padding"] = `${layout.padding}px`;
  if (layout.align) out["align-items"] = FLEX_ALIGN[layout.align];
  if (layout.justify) out["justify-content"] = FLEX_JUSTIFY[layout.justify];
  return out;
}

/**
 * Make text-bearing leaves match the GUI canvas exactly: the content is
 * vertically centered, horizontally aligned per textAlign, and clipped to the
 * box. Without this, browser <p>/<button> defaults (margins, top alignment)
 * shift text and cause overlap — the "canvas looks fine, preview is broken" bug.
 */
function contentCss(node: Node, hasChildren: boolean): Record<string, string> {
  if (hasChildren) return {};
  switch (node.type) {
    case "Text":
    case "Button":
    case "Link":
    case "Badge": {
      const a = node.style?.textAlign;
      return {
        display: "flex",
        "align-items": "center",
        "justify-content": a === "center" ? "center" : a === "right" ? "flex-end" : "flex-start",
        overflow: "hidden",
        margin: "0",
        padding: "0 4px",
      };
    }
    default:
      return {};
  }
}

function initials(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : t.slice(0, 2)).toUpperCase();
}

function renderNode(node: Node, depth: number, parentFlex: boolean, ctx: Ctx): string {
  const pad = "  ".repeat(depth);

  // An Instance resolves to its component subtree (overrides + namespaced ids).
  if (node.type === "Instance") {
    const m = materializeInstance(ctx.doc, node);
    if (!m) {
      const css = styleToCss(node.style, positionCss(node, parentFlex), ctx.tokens);
      return `${pad}<div id="${esc(node.id)}" style="${esc(css)}" class="drafter-missing">missing component: ${esc(node.componentId ?? "")}</div>`;
    }
    return renderNode(m, depth, parentFlex, ctx);
  }

  const flex = node.layout?.mode === "flex";
  const hasKids = (node.children?.length ?? 0) > 0;
  const css = styleToCss(node.style, { ...positionCss(node, parentFlex), ...flexContainerCss(node.layout), ...contentCss(node, hasKids) }, ctx.tokens);
  const idAttr = ` id="${esc(node.id)}"`;
  const styleAttr = ` style="${esc(css)}"`;
  const p = node.props ?? {};
  const childHtml = (node.children ?? [])
    .filter((c) => !c.hidden)
    .map((c) => renderNode(c, depth + 1, flex, ctx))
    .join("\n");
  const inner = childHtml ? `\n${childHtml}\n${pad}` : "";

  switch (node.type) {
    case "Button": {
      const label = esc(p.label ?? "");
      return `${pad}<button${idAttr}${styleAttr}>${label}${inner}</button>`;
    }
    case "Text": {
      const text = esc(p.text ?? "");
      return `${pad}<p${idAttr}${styleAttr}>${text}${inner}</p>`;
    }
    case "Image": {
      return `${pad}<img${idAttr}${styleAttr} src="${esc(p.src ?? "")}" alt="${esc(p.alt ?? "")}" />`;
    }
    case "Input": {
      const t = esc(p.inputType ?? "text");
      return `${pad}<input${idAttr}${styleAttr} type="${t}" placeholder="${esc(p.placeholder ?? "")}" />`;
    }
    case "Link": {
      const text = esc(p.text ?? p.label ?? "リンク");
      return `${pad}<a${idAttr}${styleAttr} href="${esc(p.href ?? "#")}">${text}${inner}</a>`;
    }
    case "Textarea": {
      return `${pad}<textarea${idAttr}${styleAttr} placeholder="${esc(p.placeholder ?? "")}">${esc(p.body ?? "")}</textarea>`;
    }
    case "Checkbox": {
      const checked = p.checked ? " checked" : "";
      return `${pad}<label${idAttr}${styleAttr} class="drafter-check"><input type="checkbox"${checked} /><span>${esc(p.label ?? "")}</span></label>`;
    }
    case "Switch": {
      const checked = p.checked ? " checked" : "";
      const label = p.label ? `<span class="drafter-switch-text">${esc(p.label)}</span>` : "";
      return `${pad}<label${idAttr}${styleAttr} class="drafter-switch"><input type="checkbox"${checked} /><span class="drafter-slider"></span>${label}</label>`;
    }
    case "Select": {
      const opts = (p.options ?? []).map((o) => `<option>${esc(o)}</option>`).join("");
      return `${pad}<select${idAttr}${styleAttr}>${opts}</select>`;
    }
    case "Divider": {
      return `${pad}<div${idAttr}${styleAttr} class="drafter-divider"></div>`;
    }
    case "Badge": {
      return `${pad}<span${idAttr}${styleAttr} class="drafter-badge">${esc(p.text ?? p.label ?? "")}</span>`;
    }
    case "Avatar": {
      if (p.src) return `${pad}<img${idAttr}${styleAttr} class="drafter-avatar" src="${esc(p.src)}" alt="${esc(p.alt ?? "")}" />`;
      return `${pad}<div${idAttr}${styleAttr} class="drafter-avatar">${esc(initials(p.text ?? p.label ?? node.name ?? ""))}</div>`;
    }
    case "List": {
      const lis = (p.items ?? []).map((i) => `<li>${esc(i)}</li>`).join("");
      return `${pad}<ul${idAttr}${styleAttr} class="drafter-list">${lis}</ul>`;
    }
    case "Accordion": {
      const body = inner || esc(p.body ?? "");
      return `${pad}<details${idAttr}${styleAttr} class="drafter-accordion"><summary>${esc(p.title ?? "詳細")}</summary><div class="drafter-acc-body">${body}</div></details>`;
    }
    case "NavBar": {
      const items = (p.items ?? []).map((i) => `<a href="#">${esc(i)}</a>`).join("");
      const toggleId = `nav-${esc(node.id)}`;
      const burger = p.collapsible === false ? "" : `<input type="checkbox" id="${toggleId}" class="drafter-nav-toggle" /><label for="${toggleId}" class="drafter-nav-burger">☰</label>`;
      const collapsible = p.collapsible === false ? "" : " drafter-nav-collapsible";
      return `${pad}<nav${idAttr}${styleAttr} class="drafter-nav${collapsible}"><span class="drafter-nav-brand">${esc(p.title ?? "Menu")}</span>${burger}<div class="drafter-nav-links">${items}</div></nav>`;
    }
    case "Embed": {
      const src = esc(p.src ?? "");
      if (!src) return `${pad}<div${idAttr}${styleAttr} class="drafter-embed">${esc(p.title ?? "Embed")}</div>`;
      return `${pad}<iframe${idAttr}${styleAttr} class="drafter-embed" src="${src}" loading="lazy" frameborder="0" allowfullscreen></iframe>`;
    }
    case "Icon": {
      return `${pad}<div${idAttr}${styleAttr} class="drafter-icon">${esc(p.text ?? "★")}</div>`;
    }
    case "ProgressBar": {
      const v = Math.max(0, Math.min(100, p.value ?? 50));
      return `${pad}<div${idAttr}${styleAttr} class="drafter-progress"><div class="drafter-progress-fill" style="width:${v}%"></div></div>`;
    }
    case "Frame":
    case "Rectangle":
    default:
      return `${pad}<div${idAttr}${styleAttr}>${inner}</div>`;
  }
}

/**
 * Shared component styles + the CSS-only interactivity (accordion via <details>,
 * switch via :checked sibling, NavBar menu open/close via a hidden checkbox).
 * Emitted once into <head> so the generated page is self-contained and live.
 */
const COMPONENT_CSS = `
    .drafter-check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .drafter-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
    .drafter-switch input { display: none; }
    .drafter-switch .drafter-slider { position: relative; width: 40px; height: 22px; flex: 0 0 auto; background: #cbd5e1; border-radius: 999px; transition: .2s; }
    .drafter-switch .drafter-slider::before { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: .2s; }
    .drafter-switch input:checked + .drafter-slider { background: #2563eb; }
    .drafter-switch input:checked + .drafter-slider::before { transform: translateX(18px); }
    .drafter-divider { background: #e5e7eb; }
    .drafter-badge { display: inline-flex; align-items: center; justify-content: center; padding: 2px 10px; border-radius: 999px; font-size: 12px; background: #e0e7ff; color: #3730a3; }
    .drafter-avatar { border-radius: 50%; object-fit: cover; display: flex; align-items: center; justify-content: center; background: #c7d2fe; color: #3730a3; font-weight: 700; }
    .drafter-list { margin: 0; padding-left: 20px; }
    .drafter-accordion { overflow: visible; }
    .drafter-accordion > summary { cursor: pointer; list-style: revert; padding: 8px 0; font-weight: 600; }
    .drafter-acc-body { padding: 4px 0; }
    .drafter-nav { display: flex; align-items: center; gap: 16px; padding: 0 16px; overflow: visible; }
    .drafter-nav-brand { font-weight: 700; }
    .drafter-nav-links { display: flex; gap: 16px; }
    .drafter-nav-links a { color: inherit; text-decoration: none; }
    .drafter-nav-toggle { display: none; }
    .drafter-nav-burger { margin-left: auto; cursor: pointer; font-size: 20px; user-select: none; }
    .drafter-nav-collapsible .drafter-nav-links { display: none; position: absolute; top: 100%; left: 0; right: 0; flex-direction: column; gap: 12px; padding: 12px 16px; background: inherit; box-shadow: 0 8px 24px rgba(0,0,0,.12); }
    .drafter-nav-toggle:checked ~ .drafter-nav-links { display: flex; }
    .drafter-embed { border: 0; display: flex; align-items: center; justify-content: center; color: #6b7280; background: #f1f5f9; }
    .drafter-icon { display: flex; align-items: center; justify-content: center; line-height: 1; }
    .drafter-progress { background: #e5e7eb; border-radius: 999px; overflow: hidden; }
    .drafter-progress-fill { height: 100%; background: #2563eb; border-radius: 999px; }
    .drafter-missing { display: flex; align-items: center; justify-content: center; color: #b91c1c; background: repeating-linear-gradient(45deg, #fef2f2, #fef2f2 8px, #fee2e2 8px, #fee2e2 16px); border: 1px dashed #ef4444; font-size: 12px; }
`;

export function generateHtml(doc: Document): string {
  const c = doc.canvas;
  const ctx: Ctx = { doc, tokens: doc.tokens };
  const rootCss = styleToCss(undefined, {
    position: "relative",
    width: `${c.width}px`,
    height: `${c.height}px`,
    background: c.background,
    margin: "0 auto",
    overflow: "hidden",
  });
  const body = renderNode(doc.root, 3, false, ctx);
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(doc.name)}</title>
  <style>
${tokenRootCss(doc.tokens)}    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f4f5; font-family: system-ui, sans-serif; }
    .drafter-canvas * { margin: 0; }
    .drafter-canvas p { line-height: 1.2; }
    .drafter-canvas button, .drafter-canvas input, .drafter-canvas textarea, .drafter-canvas select { font-family: inherit; }
${COMPONENT_CSS}  </style>
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
