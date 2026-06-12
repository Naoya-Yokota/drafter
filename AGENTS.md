# Drafter — guide for AI agents

Drafter is an **IR-centric UI design tool**. A single screen is described by one
JSON file, `design.json`, conforming to [`schema/design.schema.json`](schema/design.schema.json).
The GUI editor, human designers, and AI agents all read/write the **same IR**;
code generators turn the IR into code (HTML today, more later). Think of it as
"Figma whose document is a small, diffable JSON you can author directly."

If you are an AI building or editing UI, **produce/modify `design.json`**, not HTML.

## The IR in one minute

```jsonc
{
  "version": "0.1",
  "name": "Login",
  "canvas": { "width": 390, "height": 844, "background": "#ffffff" },
  "root": {
    "id": "screen", "type": "Frame", "frame": { "x": 0, "y": 0, "w": 390, "h": 844 },
    "children": [
      { "id": "title", "type": "Text", "frame": { "x": 24, "y": 80, "w": 342, "h": 36 },
        "props": { "text": "ようこそ" }, "style": { "fontSize": 28, "fontWeight": 700, "textAlign": "center" } }
    ]
  }
}
```

- **Coordinates are absolute.** A child's `frame.x/y` is relative to its parent's top-left.
- **One screen, one breakpoint.** The IR is design *intent* at a fixed size — when you
  generate a real (responsive) app, reinterpret it into semantic flex/grid + components.
  Preserve hierarchy, text, colors, and spacing.
- **`type`** is one of: Frame, Text, Button, Image, Input, Rectangle, Link, Textarea,
  Checkbox, Switch, Select, Divider, Badge, Avatar, List, Accordion, NavBar, Embed, Icon, ProgressBar, Instance.
- **`props`** carry content: `text`, `label`, `placeholder`, `src`, `items[]`, `options[]`,
  `title`, `value`, `checked`, … (see the schema for which type uses which).
- **`style`** is a small CSS subset: `background` (color or gradient), `color`, `fontSize`,
  `fontWeight`, `textAlign`, `borderRadius`, `border`, `shadow`, `opacity`, `padding`, `overflow`, …
- **`layout.mode: "flex"`** turns a Frame into a flex container (children flow; their x/y are ignored).

### Design tokens & components

- **`tokens.colors`** (top-level): named colors. Set any `style.background`/`color`/`border`
  to `"{name}"` to reference one — change the token once and every reference updates.
  Codegen emits CSS variables (`var(--color-name)`); the canvas resolves to the literal value.
- **`components`** (top-level): reusable definitions keyed by id — `{ "card": { "name": "...", "root": <node> } }`.
- **`Instance`** node: place a component with `{ "type": "Instance", "componentId": "card", "frame": {…} }`.
  Per-instance tweaks go in `overrides`, keyed by the inner node's id:
  `"overrides": { "card_title": { "props": { "text": "…" }, "style": { "color": "{brand}" } } }`.
  React codegen turns each component definition into a named function component.
  See [`examples/tokens-demo.json`](examples/tokens-demo.json).

## Rules when generating a screen

1. Output the **whole** `design.json` as pure JSON — no prose, no code fences.
2. Every `id` must be **unique**.
3. Keep every `frame` inside its parent; **don't overlap** elements unintentionally; leave readable spacing.
4. Use semantic `type`s (NavBar, Button, Input…) so downstream codegen/AI can infer meaning.
5. Validate against `schema/design.schema.json`.

## How a human + AI loop works

1. AI generates a `design.json` from a prompt (or starts from a template).
2. A human tweaks it in the GUI (move, resize, recolor, edit text) — no AI round-trip needed.
3. `design.json` stays the **single source of truth**; codegen (or a downstream AI) builds the
   real site/app from it. Iterate by editing the IR, not the built output.

## Programmatic entry points

- **MCP server:** `mcp/server.ts` exposes `get_schema`, `read_design`, `write_design`,
  `edit_node`, `validate_design`, `generate_html`, `generate_react`, `describe_design`, `export_ai_pack`.
  Configure it in your MCP client (see `docs/MCP.md`) to read/write `design.json` natively.
  Deterministic tools only — the server never calls an LLM.
- **CLI:** `node src/cli.ts <design.json> [outDir] [--target html|react]` → validates and writes
  `out/index.html` (or `out/Screen.tsx` for React).
- **Codegen:** `generateHtml(doc)` in `src/codegen/html.ts` and `generateReact(doc)` in
  `src/codegen/react.ts` (`IR -> string`, pure, no AI).
- **Validation:** `parseDocument(raw)` in `src/ir/schema.ts` (zod), or the JSON Schema.
- **AI handoff pack:** the editor's "AIパック" export bundles description + IR + HTML in one file —
  the ideal prompt for a downstream model.

Codegen is a plugin (`IR -> string`); new targets (React/TSX, Unity, mobile) can be added
against the same IR without touching the editor.
