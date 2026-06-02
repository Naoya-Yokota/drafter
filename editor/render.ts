import type { CSSProperties } from "react";
import type { Layout, Node, Style } from "../src/ir/schema.ts";

const ALIGN: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
const JUSTIFY: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between" };

/** Flex container CSS for a node whose layout.mode === "flex". */
export function layoutToFlexCss(layout: Layout | undefined): CSSProperties {
  if (!layout || layout.mode !== "flex") return {};
  return {
    display: "flex",
    flexDirection: layout.direction === "column" ? "column" : "row",
    gap: layout.gap,
    padding: layout.padding,
    alignItems: layout.align ? ALIGN[layout.align] : undefined,
    justifyContent: layout.justify ? JUSTIFY[layout.justify] : undefined,
  };
}

export function isFlex(node: Node): boolean {
  return node.layout?.mode === "flex";
}

/**
 * Editor-side render of a node's box, kept faithful to codegen/html.ts so the
 * canvas is true WYSIWYG: what you drag here is exactly what generateHtml emits.
 * The canonical output is still html.ts — this only mirrors it for interaction.
 */
export function styleToCss(style: Style | undefined): CSSProperties {
  const out: CSSProperties = {};
  if (!style) return out;
  if (style.background) out.background = style.background;
  if (style.color) out.color = style.color;
  if (style.fontSize != null) out.fontSize = style.fontSize;
  if (style.fontWeight != null) out.fontWeight = style.fontWeight as CSSProperties["fontWeight"];
  if (style.fontFamily) out.fontFamily = style.fontFamily;
  if (style.textAlign) out.textAlign = style.textAlign;
  if (style.borderRadius != null) out.borderRadius = style.borderRadius;
  if (style.border) out.border = style.border;
  if (style.opacity != null) out.opacity = style.opacity;
  if (style.shadow) out.boxShadow = style.shadow;
  return out;
}

export function nodeBoxStyle(node: Node): CSSProperties {
  const f = node.frame;
  return {
    position: "absolute",
    left: f.x,
    top: f.y,
    width: f.w,
    height: f.h,
    ...styleToCss(node.style),
  };
}

/** A representative label for the canvas (the Preview iframe shows true output). */
export function nodeText(node: Node): string {
  const p = node.props ?? {};
  switch (node.type) {
    case "Button":
      return p.label ?? "";
    case "Text":
      return p.text ?? "";
    case "Input":
      return p.placeholder ?? "";
    case "Link":
      return p.text ?? p.label ?? "リンク";
    case "Textarea":
      return p.placeholder ?? p.body ?? "";
    case "Checkbox":
      return `☑ ${p.label ?? ""}`;
    case "Switch":
      return `${p.checked ? "🔵" : "⚪"} ${p.label ?? ""}`;
    case "Select":
      return `${p.options?.[0] ?? "選択…"} ▾`;
    case "Badge":
      return p.text ?? p.label ?? "";
    case "Avatar":
      return p.src ? "" : "👤";
    case "List":
      return (p.items ?? []).map((i) => `• ${i}`).join("   ");
    case "Accordion":
      return `▸ ${p.title ?? "詳細"}`;
    case "NavBar":
      return `☰ ${p.title ?? "Menu"}   ${(p.items ?? []).join("  ")}`;
    default:
      return "";
  }
}
