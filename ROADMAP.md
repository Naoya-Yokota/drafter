# Roadmap — toward pro-designer (Figma-level) parity

Goal: everything a professional designer wants for **single-screen layout** can be
done in Drafter, so its `design.json` is a complete, unambiguous visual spec for AI.

Honest framing: full Figma parity is a long road (vector editing, components,
prototyping, multiplayer, plugins). Drafter intentionally scopes to **one screen,
no runtime behavior** — but within that scope we aim for parity. Below, ✅ done,
🟡 partial, ⬜ planned.

## Editing & canvas
- ✅ Move / resize, alignment snapping + guides, zoom
- ✅ Marquee multi-select, Ctrl-click, group move, align, distribute
- ✅ Undo/redo, copy/paste/duplicate, group/ungroup, lock/hide, z-order
- ✅ Numeric-expression inputs, double-click inline text edit, command palette
- ✅ Multi-handle resize (8 handles), smart distance badges (Alt-measure), reparent by drag-into-frame
- 🟡 Auto-layout (flex exists; needs hug/fill sizing, on-canvas padding handles)
- ⬜ Rulers & draggable guides, pixel grid snap toggle
- ⬜ Rotate, flip, constraints/pinning
- ⬜ Nudge-to-reorder layers by drag

## Styling
- ✅ Fill (solid + gradient presets), color palette / recent / document colors / eyedropper
- ✅ Border, radius, shadow, opacity, overflow (scroll), padding, blur(backdrop)
- 🟡 Typography (size/weight/family/align/line-height/letter-spacing; needs text styles)
- ⬜ Multiple fills/strokes, gradient editor (stops/angle), image fills & object-fit UI
- ⬜ Blend modes, per-corner radius, stroke align

## Components & systems
- ✅ **Components / instances** (define from selection, reuse, place; per-node overrides; edit-master-in-place)
- 🟡 **Design tokens / variables** (color tokens shipped, referenced by `{name}`; spacing/type scales next)
- ⬜ Variants (e.g. button states), shared/text styles

## Vector & shapes
- 🟡 Rectangle, divider, icon (emoji/glyph)
- ⬜ Pen/vector paths, boolean ops, polygons/lines/arrows, SVG import

## Assets & content
- ✅ Image (URL), Embed (map/video/iframe), List, Badge, Avatar, ProgressBar
- ⬜ Image upload / asset library, icon set (not just emoji)

## Multi-screen / flow
**Deliberately deferred — kept lightweight on purpose.** Full Figma-style
interactive prototyping (click triggers, transitions, animations) is explicitly
**out of scope**: it breaks Drafter's "no runtime behavior" promise, competes
head-on with Penpot (far more mature), and would bloat the "one screen, done
fast" UX that is our actual differentiation. Even Pencil.dev (the closest
prior art, ~100k users) avoids it — they only place multiple *frames* in one
file as a static visual truth for the AI.

- ⬜ **Lite: multi-frame** — multiple artboards/frames in one `design.json`
  (e.g. mobile 390 + desktop 1440), as static visual truth. No runtime behavior.
- ⬜ **Lite: static flow map** — `flows[]` metadata only ("node X relates to
  screen Y") as a *hint to the AI*, not a trigger. Codegen stays at plain
  `<a href>` at most.
- ❌ **Won't do: interactive prototyping** — triggers/transitions/animations,
  prototype mode, on-canvas connection lines. (Use Penpot if you need this.)

## Codegen & handoff
- ✅ HTML codegen, live preview, HTML export
- ✅ **React/TSX codegen** (named components per definition; `--target react` / `generate_react`)
- ✅ Design-token export (CSS variables in HTML/React output)
- ✅ AI handoff pack (description + IR + HTML)
- ✅ Inspect/measure (Alt-measure distance badges)
- ⬜ PNG/SVG export, copy-as-CSS

## AI
- ✅ Generate screen from prompt (BYOA claude) → IR
- ✅ Comment-driven edit (BYOA claude) → IR
- ⬜ Diff/approve UI for AI edits, selection-scoped AI, semantic auto-labeling

## Distribution & OSS
- ✅ MIT license, JSON Schema, AGENTS.md, CI, contributing/issue templates
- ⬜ `npx drafter` (extract dev API into a standalone server), Tauri desktop build
- ⬜ Template gallery with thumbnails, docs site, live demo

## Suggested next milestones
1. ✅ **Components + design tokens** — shipped (color tokens, components/instances/overrides).
2. ✅ **React/TSX codegen** — shipped.
3. ✅ **Distance badges, 8-handle resize, reparent-by-drag** — shipped. (Rulers/guides still open.)
4. **Spacing/type tokens** — extend the token system beyond color.
5. **AI diff/approve + selection-scoped edits** — make the AI loop trustworthy.
6. *(Maybe, later)* **Lite multi-frame + static flow map** — only the no-behavior
   subset above. Reassess demand first; do NOT build interactive prototyping.

> Positioning note: our wedge is **browser-only, IDE-independent, BYOA ($0 ops),
> tiny hand-writable IR, one screen done well**. Every item above is chosen to
> deepen that wedge. Multi-screen/prototyping pulls toward Penpot's turf where
> we can't win, so it stays demoted to the lite subset.
