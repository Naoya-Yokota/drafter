import { z } from "zod";

/**
 * Drafter IR (Intermediate Representation)
 * ----------------------------------------
 * The single source of truth. The GUI editor, AI agents, and all code
 * generators read/write THIS — never the generated code directly.
 *
 * Design notes:
 * - Target-agnostic but HTML-friendly first. Types map cleanly to DOM
 *   elements now, and to Unity uGUI / mobile widgets later.
 * - `frame` is absolute (x,y,w,h) within the parent for the MVP. A flex
 *   `layout` mode is included so we can grow into constraint/auto-layout
 *   without breaking the schema.
 * - `comments` live ON the node. This is what powers comment-driven AI
 *   edits and stays diff-friendly in git so Claude Code can read it.
 */

export const Frame = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type Frame = z.infer<typeof Frame>;

export const Style = z
  .object({
    background: z.string().optional(),
    color: z.string().optional(),
    fontSize: z.number().optional(),
    fontWeight: z.union([z.number(), z.string()]).optional(),
    fontFamily: z.string().optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
    borderRadius: z.number().optional(),
    border: z.string().optional(),
    opacity: z.number().min(0).max(1).optional(),
    shadow: z.string().optional(),
  })
  .strict();
export type Style = z.infer<typeof Style>;

export const Layout = z
  .object({
    mode: z.enum(["absolute", "flex"]).default("absolute"),
    direction: z.enum(["row", "column"]).optional(),
    gap: z.number().optional(),
    padding: z.number().optional(),
    align: z.enum(["start", "center", "end", "stretch"]).optional(),
    justify: z.enum(["start", "center", "end", "between"]).optional(),
  })
  .strict();
export type Layout = z.infer<typeof Layout>;

export const Comment = z.object({
  id: z.string(),
  author: z.enum(["user", "ai"]).default("user"),
  text: z.string(),
  /** false = the AI still needs to act on this. */
  resolved: z.boolean().default(false),
  createdAt: z.string().optional(),
});
export type Comment = z.infer<typeof Comment>;

export const NodeType = z.enum([
  "Frame", // generic container -> <div>
  "Text", // -> <p>/<span>
  "Button", // -> <button>
  "Image", // -> <img>
  "Input", // -> <input>
  "Rectangle", // -> <div> (pure shape)
]);
export type NodeType = z.infer<typeof NodeType>;

export const Props = z
  .object({
    text: z.string().optional(), // Text
    label: z.string().optional(), // Button
    src: z.string().optional(), // Image
    alt: z.string().optional(), // Image
    placeholder: z.string().optional(), // Input
    inputType: z.string().optional(), // Input ("text" | "email" | ...)
    href: z.string().optional(), // Button-as-link
    variant: z.string().optional(), // semantic hint, e.g. "primary"
  })
  .strict();
export type Props = z.infer<typeof Props>;

// Nodes are recursive, so the type is declared explicitly and the schema
// uses z.lazy for the children field.
export interface Node {
  id: string;
  type: NodeType;
  name?: string;
  frame: Frame;
  layout?: Layout;
  style?: Style;
  props?: Props;
  comments?: Comment[];
  children?: Node[];
}

export const Node: z.ZodType<Node> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      type: NodeType,
      name: z.string().optional(),
      frame: Frame,
      layout: Layout.optional(),
      style: Style.optional(),
      props: Props.optional(),
      comments: z.array(Comment).optional(),
      children: z.array(Node).optional(),
    })
    .strict()
);

export const Canvas = z
  .object({
    width: z.number().default(1440),
    height: z.number().default(1024),
    background: z.string().default("#ffffff"),
  })
  .strict();
export type Canvas = z.infer<typeof Canvas>;

export const Document = z
  .object({
    version: z.literal("0.1"),
    name: z.string().default("Untitled"),
    canvas: Canvas,
    root: Node,
  })
  .strict();
export type Document = z.infer<typeof Document>;

/** Parse + validate raw JSON into a typed Document (throws on error). */
export function parseDocument(raw: unknown): Document {
  return Document.parse(raw);
}

/** Walk every node depth-first (root included). */
export function* walk(node: Node): Generator<Node> {
  yield node;
  for (const child of node.children ?? []) yield* walk(child);
}

/** All unresolved comments across the document, with their owning node. */
export function openComments(doc: Document): { node: Node; comment: Comment }[] {
  const out: { node: Node; comment: Comment }[] = [];
  for (const node of walk(doc.root)) {
    for (const c of node.comments ?? []) {
      if (!c.resolved) out.push({ node, comment: c });
    }
  }
  return out;
}
