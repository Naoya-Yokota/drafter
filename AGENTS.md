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
  Checkbox, Switch, Select, Divider, Badge, Avatar, List, Accordion, NavBar, Embed, Icon, ProgressBar.
- **`props`** carry content: `text`, `label`, `placeholder`, `src`, `items[]`, `options[]`,
  `title`, `value`, `checked`, … (see the schema for which type uses which).
- **`style`** is a small CSS subset: `background` (color or gradient), `color`, `fontSize`,
  `fontWeight`, `textAlign`, `borderRadius`, `border`, `shadow`, `opacity`, `padding`, `overflow`, …
- **`layout.mode: "flex"`** turns a Frame into a flex container (children flow; their x/y are ignored).

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

- **CLI:** `node src/cli.ts <design.json> [outDir]` → validates and writes `out/index.html`.
- **Codegen:** `generateHtml(doc)` in `src/codegen/html.ts` (`IR -> string`, pure, no AI).
- **Validation:** `parseDocument(raw)` in `src/ir/schema.ts` (zod), or the JSON Schema.
- **AI handoff pack:** the editor's "AIパック" export bundles description + IR + HTML in one file —
  the ideal prompt for a downstream model.

Codegen is a plugin (`IR -> string`); new targets (React/TSX, Unity, mobile) can be added
against the same IR without touching the editor.
