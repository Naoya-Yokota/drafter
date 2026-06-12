import type { Document, Node } from "../src/ir/schema.ts";

/**
 * Build an "AI handoff pack": a single markdown document bundling a
 * natural-language description of the screen, the exact IR (design.json), and
 * the rendered standalone HTML. This is what you paste into a downstream AI to
 * have it build the real, responsive site/app — structure + look + words.
 */

function nodeLabel(n: Node): string {
  const p = n.props ?? {};
  return p.text ?? p.label ?? p.title ?? p.placeholder ?? (p.items ? p.items.join(" / ") : "") ?? "";
}

function describeNode(n: Node, depth: number, doc: Document, out: string[]) {
  const f = n.frame;
  const indent = "  ".repeat(depth);
  const pos = `@(${f.x},${f.y}) ${f.w}×${f.h}`;

  if (n.type === "Instance") {
    const def = doc.components?.[n.componentId ?? ""];
    const overs = Object.entries(n.overrides ?? {})
      .map(([id, ov]) => `${id}→${ov.props?.text ?? ov.props?.label ?? ov.props?.title ?? ov.style?.color ?? "…"}`)
      .join(", ");
    out.push(`${indent}- **Instance** of “${def?.name ?? n.componentId}” ${pos}${overs ? ` {overrides: ${overs}}` : ""}`);
    return;
  }

  const label = nodeLabel(n);
  const styleBits: string[] = [];
  if (n.style?.background) styleBits.push(`bg:${n.style.background}`);
  if (n.style?.color) styleBits.push(`color:${n.style.color}`);
  if (n.style?.fontSize) styleBits.push(`${n.style.fontSize}px`);
  if (n.style?.fontWeight) styleBits.push(`w${n.style.fontWeight}`);
  if (n.layout?.mode === "flex") styleBits.push(`flex-${n.layout.direction ?? "row"}`);
  const style = styleBits.length ? ` {${styleBits.join(", ")}}` : "";
  out.push(`${indent}- **${n.type}**${label ? ` “${label}”` : ""} ${pos}${style}`);
  for (const c of n.children ?? []) if (!c.hidden) describeNode(c, depth + 1, doc, out);
}

export function describeDoc(doc: Document): string {
  const out: string[] = [];
  out.push(`Screen **${doc.name}** — ${doc.canvas.width}×${doc.canvas.height}, background ${doc.canvas.background}.`);

  const colors = Object.entries(doc.tokens?.colors ?? {});
  if (colors.length) {
    out.push("");
    out.push(`Design tokens (referenced as \`{name}\` — keep them as variables in the real code):`);
    for (const [name, value] of colors) out.push(`- \`{${name}}\` = ${value}`);
  }

  const comps = Object.entries(doc.components ?? {});
  if (comps.length) {
    out.push("");
    out.push(`Components (define once, reuse as instances — build these as real components):`);
    for (const [, def] of comps) {
      out.push(`- **${def.name}** (${def.root.frame.w}×${def.root.frame.h}):`);
      for (const c of def.root.children ?? []) if (!c.hidden) describeNode(c, 1, doc, out);
    }
  }

  out.push("");
  out.push("Layout tree (absolute coordinates, child positions are relative to parent):");
  for (const c of doc.root.children ?? []) if (!c.hidden) describeNode(c, 0, doc, out);
  return out.join("\n");
}

export function buildAiPack(doc: Document, html: string): string {
  return [
    `# ${doc.name} — Drafter design handoff`,
    "",
    "This is a single-screen visual spec produced with **Drafter** (an IR-centric layout tool).",
    "Use it as ground-truth design intent. The coordinates describe ONE breakpoint",
    `(${doc.canvas.width}×${doc.canvas.height}); reinterpret them into responsive, semantic,`,
    "production code (e.g. flex/grid + components). Preserve hierarchy, text, colors and spacing.",
    "",
    "## 1. Description",
    "",
    describeDoc(doc),
    "",
    "## 2. design.json (the IR — single source of truth)",
    "",
    "```json",
    JSON.stringify(doc, null, 2),
    "```",
    "",
    "## 3. Rendered standalone HTML (the exact look)",
    "",
    "```html",
    html,
    "```",
    "",
  ].join("\n");
}
