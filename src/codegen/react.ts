import type { Document, Node, Style, Tokens, ComponentDef } from "../ir/schema.ts";
import { resolveColorToCss, tokenRootCss } from "../ir/tokens.ts";
import { materializeInstance } from "../ir/instance.ts";

/**
 * React/TSX code generator: IR -> a single self-contained .tsx file.
 *
 * Mirrors codegen/html.ts decision-for-decision (absolute positioning, the same
 * content-centering, the same component visuals) so the React output looks
 * identical to the HTML output and the canvas. The differences are surface only:
 * styles are React.CSSProperties objects, tokens stay live via var(--color-*),
 * and every component DEFINITION becomes a real named React function — instances
 * call it as <Brand .../>, so the generated code reads like hand-written code.
 */

type StyleObj = Record<string, string | number>;
type RCtx = { doc: Document; tokens?: Tokens; fnName: (id: string) => string };

const FLEX_ALIGN: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
const FLEX_JUSTIFY: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between" };

/** Escape a string for use inside a JSX `{"..."}` expression. */
function q(s: string): string {
  return JSON.stringify(s);
}

/** Serialize a style object to a JS object literal, e.g. { position: "absolute", left: 10 }. */
function styleLiteral(obj: StyleObj): string {
  const entries = Object.entries(obj).map(([k, v]) => `${k}: ${typeof v === "number" ? v : q(v)}`);
  return `{ ${entries.join(", ")} }`;
}

function styleToObj(style: Style | undefined, extra: StyleObj, tokens?: Tokens): StyleObj {
  const out: StyleObj = { ...extra };
  if (style) {
    if (style.background) out.background = resolveColorToCss(style.background, tokens)!;
    if (style.color) out.color = resolveColorToCss(style.color, tokens)!;
    if (style.fontSize != null) out.fontSize = style.fontSize;
    if (style.fontWeight != null) out.fontWeight = style.fontWeight;
    if (style.fontFamily) out.fontFamily = style.fontFamily;
    if (style.textAlign) out.textAlign = style.textAlign;
    if (style.borderRadius != null) out.borderRadius = style.borderRadius;
    if (style.border) out.border = resolveColorToCss(style.border, tokens)!;
    if (style.opacity != null) out.opacity = style.opacity;
    if (style.shadow) out.boxShadow = style.shadow;
    if (style.overflow) out.overflow = style.overflow;
    if (style.padding != null) out.padding = style.padding;
    if (style.lineHeight != null) out.lineHeight = style.lineHeight;
    if (style.letterSpacing != null) out.letterSpacing = style.letterSpacing;
    if (style.backdrop) out.backdropFilter = style.backdrop;
  }
  return out;
}

function positionObj(node: Node, parentFlex: boolean): StyleObj {
  const f = node.frame;
  if (parentFlex) return { position: "relative", width: f.w, height: f.h };
  return { position: "absolute", left: f.x, top: f.y, width: f.w, height: f.h };
}

function flexContainerObj(layout: Node["layout"]): StyleObj {
  if (!layout || layout.mode !== "flex") return {};
  const out: StyleObj = { display: "flex", flexDirection: layout.direction === "column" ? "column" : "row" };
  if (layout.gap != null) out.gap = layout.gap;
  if (layout.padding != null) out.padding = layout.padding;
  if (layout.align) out.alignItems = FLEX_ALIGN[layout.align];
  if (layout.justify) out.justifyContent = FLEX_JUSTIFY[layout.justify];
  return out;
}

function contentObj(node: Node, hasChildren: boolean): StyleObj {
  if (hasChildren) return {};
  switch (node.type) {
    case "Text":
    case "Button":
    case "Link":
    case "Badge": {
      const a = node.style?.textAlign;
      return {
        display: "flex",
        alignItems: "center",
        justifyContent: a === "center" ? "center" : a === "right" ? "flex-end" : "flex-start",
        overflow: "hidden",
        margin: 0,
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

/** Render one node to a JSX string. `extraStyle` lets an instance pass placement. */
function renderNode(node: Node, depth: number, parentFlex: boolean, ctx: RCtx, extraStyle?: StyleObj): string {
  const pad = "  ".repeat(depth);

  if (node.type === "Instance") {
    const def = ctx.doc.components?.[node.componentId ?? ""];
    const placement = positionObj(node, parentFlex);
    // Clean path: no overrides -> call the named component with just placement.
    if (def && !node.overrides) {
      return `${pad}<${ctx.fnName(node.componentId!)} style={${styleLiteral(placement)}} />`;
    }
    // Override path / missing: inline the materialized subtree (still correct).
    const m = materializeInstance(ctx.doc, node);
    if (!m) return `${pad}<div style={${styleLiteral({ ...placement, display: "flex", alignItems: "center", justifyContent: "center", color: "#b91c1c", border: "1px dashed #ef4444" })}}>{${q("missing component: " + (node.componentId ?? ""))}}</div>`;
    return renderNode(m, depth, parentFlex, ctx);
  }

  const flex = node.layout?.mode === "flex";
  const kids = (node.children ?? []).filter((c) => !c.hidden);
  const hasKids = kids.length > 0;
  const obj = styleToObj(node.style, { ...positionObj(node, parentFlex), ...flexContainerObj(node.layout), ...contentObj(node, hasKids), ...extraStyle }, ctx.tokens);
  const styleAttr = ` style={${styleLiteral(obj)}}`;
  const p = node.props ?? {};
  const childJsx = kids.map((c) => renderNode(c, depth + 1, flex, ctx)).join("\n");
  const inner = childJsx ? `\n${childJsx}\n${pad}` : "";

  switch (node.type) {
    case "Button":
      return `${pad}<button${styleAttr}>{${q(p.label ?? "")}}${inner}</button>`;
    case "Text":
      return `${pad}<p${styleAttr}>{${q(p.text ?? "")}}${inner}</p>`;
    case "Image":
      return `${pad}<img${styleAttr} src={${q(p.src ?? "")}} alt={${q(p.alt ?? "")}} />`;
    case "Input":
      return `${pad}<input${styleAttr} type={${q(p.inputType ?? "text")}} placeholder={${q(p.placeholder ?? "")}} />`;
    case "Link":
      return `${pad}<a${styleAttr} href={${q(p.href ?? "#")}}>{${q(p.text ?? p.label ?? "リンク")}}${inner}</a>`;
    case "Textarea":
      return `${pad}<textarea${styleAttr} placeholder={${q(p.placeholder ?? "")}} defaultValue={${q(p.body ?? "")}} />`;
    case "Checkbox":
      return `${pad}<label${styleAttr}><input type="checkbox" defaultChecked={${String(!!p.checked)}} /> <span>{${q(p.label ?? "")}}</span></label>`;
    case "Switch":
      return `${pad}<label${styleAttr}><input type="checkbox" defaultChecked={${String(!!p.checked)}} /> <span>{${q(p.label ?? "")}}</span></label>`;
    case "Select":
      return `${pad}<select${styleAttr}>${(p.options ?? []).map((o) => `<option>{${q(o)}}</option>`).join("")}</select>`;
    case "Divider":
      return `${pad}<div${styleAttr} />`;
    case "Badge":
      return `${pad}<span${styleAttr}>{${q(p.text ?? p.label ?? "")}}</span>`;
    case "Avatar":
      if (p.src) return `${pad}<img${styleAttr} src={${q(p.src)}} alt={${q(p.alt ?? "")}} />`;
      return `${pad}<div${styleAttr}>{${q(initials(p.text ?? p.label ?? node.name ?? ""))}}</div>`;
    case "List":
      return `${pad}<ul${styleAttr}>${(p.items ?? []).map((i) => `<li>{${q(i)}}</li>`).join("")}</ul>`;
    case "Accordion":
      return `${pad}<details${styleAttr}><summary>{${q(p.title ?? "詳細")}}</summary><div>{${q(p.body ?? "")}}${inner}</div></details>`;
    case "NavBar":
      return `${pad}<nav${styleAttr}><span>{${q(p.title ?? "Menu")}}</span>${(p.items ?? []).map((i) => `<a href="#">{${q(i)}}</a>`).join("")}</nav>`;
    case "Embed":
      if (p.src) return `${pad}<iframe${styleAttr} src={${q(p.src)}} loading="lazy" />`;
      return `${pad}<div${styleAttr}>{${q(p.title ?? "Embed")}}</div>`;
    case "Icon":
      return `${pad}<div${styleAttr}>{${q(p.text ?? "★")}}</div>`;
    case "ProgressBar": {
      const v = Math.max(0, Math.min(100, p.value ?? 50));
      return `${pad}<div${styleAttr}><div style={${styleLiteral({ width: `${v}%`, height: "100%", background: "#2563eb", borderRadius: "inherit" })}} /></div>`;
    }
    case "Frame":
    case "Rectangle":
    default:
      return `${pad}<div${styleAttr}>${inner}</div>`;
  }
}

/** A valid PascalCase identifier for a component, unique per id. */
function makeFnNamer(doc: Document): (id: string) => string {
  const used = new Map<string, string>();
  const seen = new Set<string>();
  for (const [id, def] of Object.entries(doc.components ?? {})) {
    let base = (def.name || id).replace(/[^A-Za-z0-9]/g, " ").trim().split(/\s+/).map((w) => w[0]?.toUpperCase() + w.slice(1)).join("");
    if (!base || !/^[A-Za-z]/.test(base)) base = "Comp" + base;
    let name = base;
    let n = 2;
    while (seen.has(name)) name = `${base}${n++}`;
    seen.add(name);
    used.set(id, name);
  }
  return (id: string) => used.get(id) ?? "MissingComponent";
}

function renderComponentFn(id: string, def: ComponentDef, ctx: RCtx): string {
  const root = def.root;
  // The component root renders its content; placement/size come from the caller's
  // `style` (the instance frame), so the root's own x/y are ignored.
  const flex = root.layout?.mode === "flex";
  const kids = (root.children ?? []).filter((c) => !c.hidden);
  const hasKids = kids.length > 0;
  const baseObj = styleToObj(root.style, { position: "relative", width: root.frame.w, height: root.frame.h, ...flexContainerObj(root.layout), ...contentObj(root, hasKids) }, ctx.tokens);
  const childJsx = kids.map((c) => renderNode(c, 3, flex, ctx)).join("\n");
  return [
    `function ${ctx.fnName(id)}({ style }: { style?: React.CSSProperties }) {`,
    `  return (`,
    `    <div style={{ ...${styleLiteral(baseObj)}, ...style }}>`,
    childJsx,
    `    </div>`,
    `  );`,
    `}`,
  ].join("\n");
}

export function generateReact(doc: Document): string {
  const ctx: RCtx = { doc, tokens: doc.tokens, fnName: makeFnNamer(doc) };
  const c = doc.canvas;
  const canvasObj = styleToObj(undefined, { position: "relative", width: c.width, height: c.height, background: c.background, margin: "0 auto", overflow: "hidden" }, ctx.tokens);
  const componentFns = Object.entries(doc.components ?? {}).map(([id, def]) => renderComponentFn(id, def, ctx));
  const tokenCss = tokenRootCss(doc.tokens).trim();
  const body = renderNode(doc.root, 4, false, ctx);

  return `import React from "react";

// Generated by Drafter — IR -> React. The design.json IR is the source of truth;
// re-generate rather than hand-editing. Faithful to the canvas (absolute layout).
${componentFns.length ? "\n" + componentFns.join("\n\n") + "\n" : ""}
export default function Screen() {
  return (
    <>
${tokenCss ? `      <style>{\`${tokenCss}\`}</style>\n` : ""}      <div style={${styleLiteral(canvasObj)}}>
${body}
      </div>
    </>
  );
}
`;
}
