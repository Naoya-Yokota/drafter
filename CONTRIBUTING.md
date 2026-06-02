# Contributing to Drafter

Thanks for your interest! Drafter is an IR-centric UI design tool — everything
revolves around `design.json` (the IR) defined in `src/ir/schema.ts`.

## Setup

```bash
npm install
npm run dev      # editor at http://localhost:5173
```

## Before opening a PR

```bash
npm run typecheck   # tsc --noEmit, must be clean
npm run validate    # all bundled templates validate against the schema
npm run build       # vite build must succeed
```

## Architecture (where things live)

- `src/ir/schema.ts` — the IR (zod). The core. Changing it ripples everywhere.
- `src/codegen/*` — `IR -> code` generators (pure functions). Add new targets here.
- `src/cli.ts` — validate + generate from the command line.
- `editor/` — the Vite + React GUI editor (canvas, inspector, templates, AI bridge).
- `schema/design.schema.json` — published JSON Schema, keep in sync with the zod schema.
- `AGENTS.md` — how AI agents should read/write the IR. Keep in sync with the schema.

## Guidelines

- Keep `IR -> code` **one-directional**; the editor and AI write the IR, never the generated code.
- Codegen and the editor canvas must render a node **the same way** (WYSIWYG fidelity).
- New IR fields: update `schema.ts`, `schema/design.schema.json`, `AGENTS.md`, and codegen together.
- Match the surrounding code style. No new heavy dependencies without discussion.

## Reporting

Use the issue templates. For layout bugs, please include the template name (or a
minimal `design.json`) and whether it differs between the canvas and the preview.
