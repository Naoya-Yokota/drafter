import type { Tokens } from "./schema.ts";

/**
 * Design-token resolution. A style value of the form "{name}" is a reference to
 * `tokens.colors[name]`. Two resolution targets:
 *   - codegen (HTML/React): emit `var(--color-name)` so a token change in :root
 *     re-themes the whole page — the link stays live.
 *   - canvas (editor): resolve to the literal value so WYSIWYG shows real colors.
 * Non-references pass through unchanged; unknown tokens fall back to the literal
 * "{name}" so nothing silently disappears.
 */

const REF = /^\{([\w-]+)\}$/;

/** Returns the token name if `v` is a "{name}" reference, else null. */
export function isTokenRef(v: string): string | null {
  const m = REF.exec(v.trim());
  return m ? m[1] : null;
}

/** CSS custom-property name for a color token. */
export function cssVarName(name: string): string {
  return `--color-${name}`;
}

/** Resolve a color value to CSS for codegen: refs become var(--color-name). */
export function resolveColorToCss(v: string | undefined, tokens?: Tokens): string | undefined {
  if (v == null) return v;
  const name = isTokenRef(v);
  if (!name) return v;
  // Use a fallback to the literal token value (or the ref text) inside var().
  const fallback = tokens?.colors?.[name];
  return fallback ? `var(${cssVarName(name)}, ${fallback})` : `var(${cssVarName(name)})`;
}

/** Resolve a color value to a literal for the canvas: refs become their value. */
export function resolveColorToLiteral(v: string | undefined, tokens?: Tokens): string | undefined {
  if (v == null) return v;
  const name = isTokenRef(v);
  if (!name) return v;
  return tokens?.colors?.[name] ?? v;
}

/** The `:root { --color-*: ... }` block for the document's color tokens, or "". */
export function tokenRootCss(tokens?: Tokens): string {
  const colors = tokens?.colors;
  if (!colors || Object.keys(colors).length === 0) return "";
  const decls = Object.entries(colors)
    .map(([name, value]) => `      ${cssVarName(name)}: ${value};`)
    .join("\n");
  return `    :root {\n${decls}\n    }\n`;
}
