#!/usr/bin/env node
/**
 * Drafter MCP server (stdio, JSON-RPC 2.0).
 *
 * Exposes the IR as tools an MCP client (Claude Desktop / Cursor / Claude Code)
 * can call. Every tool is DETERMINISTIC — read/write/validate/codegen — so the
 * server never calls an LLM itself. The host AI does the thinking and uses these
 * tools, which means zero added AI cost (BYOA stays BYOA).
 *
 * Usage (configured by the MCP client):
 *   node mcp/server.ts [projectRoot]
 * projectRoot defaults to $DRAFTER_ROOT or the current working directory.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, isAbsolute, join } from "node:path";
import process from "node:process";
import { parseDocument, type Document, type Node } from "../src/ir/schema.ts";
import { generateHtml } from "../src/codegen/html.ts";
import { generateReact } from "../src/codegen/react.ts";
import { describeDoc, buildAiPack } from "../editor/aiexport.ts";

const ROOT = resolve(process.argv[2] ?? process.env.DRAFTER_ROOT ?? process.cwd());
const DEFAULT_PATH = "examples/design.json";

function log(...a: unknown[]) {
  process.stderr.write(a.map(String).join(" ") + "\n");
}

function safePath(rel: string): string {
  const abs = resolve(ROOT, rel);
  const inside = relative(ROOT, abs);
  if (inside.startsWith("..") || isAbsolute(inside)) throw new Error(`Path escapes project root: ${rel}`);
  return abs;
}

function readDoc(path: string): Document {
  const abs = safePath(path);
  return parseDocument(JSON.parse(readFileSync(abs, "utf8")));
}

function writeDoc(path: string, doc: Document): string {
  const abs = safePath(path);
  writeFileSync(abs, JSON.stringify(doc, null, 2) + "\n", "utf8");
  return relative(ROOT, abs);
}

/** Resolve a doc from either an inline `design` object or a file `path`. */
function getDoc(args: Record<string, unknown>): Document {
  if (args.design) return parseDocument(args.design);
  return readDoc((args.path as string) ?? DEFAULT_PATH);
}

function patchNode(node: Node, id: string, patch: Partial<Node>): Node {
  if (node.id === id) {
    return {
      ...node,
      ...patch,
      props: patch.props ? { ...node.props, ...patch.props } : node.props,
      style: patch.style ? { ...node.style, ...patch.style } : node.style,
      frame: patch.frame ? { ...node.frame, ...patch.frame } : node.frame,
    };
  }
  if (!node.children) return node;
  return { ...node, children: node.children.map((c) => patchNode(c, id, patch)) };
}

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => string;
};

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required });
const str = (description: string) => ({ type: "string", description });
const anyObj = (description: string) => ({ type: "object", description });

const TOOLS: Tool[] = [
  {
    name: "get_schema",
    description: "Return the Drafter IR JSON Schema and the list of node types. Call this first to learn the exact design.json format before generating or editing.",
    inputSchema: obj({}),
    handler: () => {
      const schemaPath = join(ROOT, "schema/design.schema.json");
      const schema = existsSync(schemaPath) ? readFileSync(schemaPath, "utf8") : "(schema/design.schema.json not found)";
      return schema;
    },
  },
  {
    name: "list_designs",
    description: "List design.json files in the project (top level and examples/).",
    inputSchema: obj({}),
    handler: () => {
      const found: string[] = [];
      const scan = (dir: string, depth: number) => {
        for (const e of readdirSync(dir)) {
          if (e === "node_modules" || e === ".git" || e === "dist" || e === "out") continue;
          const p = join(dir, e);
          const st = statSync(p);
          if (st.isDirectory() && depth < 1) scan(p, depth + 1);
          else if (e.endsWith(".json") && /design|screen/i.test(e)) found.push(relative(ROOT, p));
        }
      };
      scan(ROOT, 0);
      return found.length ? found.join("\n") : "(no design files found — use write_design to create one)";
    },
  },
  {
    name: "read_design",
    description: "Read and validate a design.json, returning the IR as JSON.",
    inputSchema: obj({ path: str(`Path relative to project root (default: ${DEFAULT_PATH}).`) }),
    handler: (a) => JSON.stringify(readDoc((a.path as string) ?? DEFAULT_PATH), null, 2),
  },
  {
    name: "validate_design",
    description: "Validate an IR object against the schema. Returns 'valid' or the validation errors.",
    inputSchema: obj({ design: anyObj("The full design.json IR object.") }, ["design"]),
    handler: (a) => {
      try {
        parseDocument(a.design);
        return "valid";
      } catch (e) {
        return `invalid:\n${(e as Error).message}`;
      }
    },
  },
  {
    name: "write_design",
    description: "Validate an IR object and write it to disk (creates or overwrites). Use this to save a screen you composed. Returns the written path.",
    inputSchema: obj({ design: anyObj("The full design.json IR object."), path: str(`Path relative to project root (default: ${DEFAULT_PATH}).`) }, ["design"]),
    handler: (a) => {
      const doc = parseDocument(a.design);
      const p = writeDoc((a.path as string) ?? DEFAULT_PATH, doc);
      return `wrote ${p}`;
    },
  },
  {
    name: "edit_node",
    description: "Patch a single node (merge into props/style/frame/name/locked/hidden) and write the file back. Returns the updated node.",
    inputSchema: obj(
      {
        path: str(`Path relative to project root (default: ${DEFAULT_PATH}).`),
        nodeId: str("The id of the node to edit."),
        patch: anyObj("Partial node to merge, e.g. { style:{background:'#000'}, props:{label:'OK'}, frame:{x:10} }."),
      },
      ["nodeId", "patch"],
    ),
    handler: (a) => {
      const path = (a.path as string) ?? DEFAULT_PATH;
      const doc = readDoc(path);
      const next = { ...doc, root: patchNode(doc.root, a.nodeId as string, a.patch as Partial<Node>) };
      const valid = parseDocument(next);
      writeDoc(path, valid);
      return `edited ${a.nodeId} in ${path}`;
    },
  },
  {
    name: "generate_html",
    description: "Generate standalone HTML from a design (by path or inline). Pure IR->HTML, no AI.",
    inputSchema: obj({ path: str("Path relative to project root."), design: anyObj("Inline IR object (alternative to path).") }),
    handler: (a) => generateHtml(getDoc(a)),
  },
  {
    name: "generate_react",
    description: "Generate a self-contained React/TSX component from a design (by path or inline). Component definitions become named React functions; instances call them. Pure IR->TSX, no AI.",
    inputSchema: obj({ path: str("Path relative to project root."), design: anyObj("Inline IR object (alternative to path).") }),
    handler: (a) => generateReact(getDoc(a)),
  },
  {
    name: "describe_design",
    description: "Return a concise natural-language description of the screen's layout tree.",
    inputSchema: obj({ path: str("Path relative to project root."), design: anyObj("Inline IR object (alternative to path).") }),
    handler: (a) => describeDoc(getDoc(a)),
  },
  {
    name: "export_ai_pack",
    description: "Return an AI handoff pack (description + IR + rendered HTML) as one markdown document — ideal context for building the real app.",
    inputSchema: obj({ path: str("Path relative to project root."), design: anyObj("Inline IR object (alternative to path).") }),
    handler: (a) => {
      const doc = getDoc(a);
      return buildAiPack(doc, generateHtml(doc));
    },
  },
];

// ── JSON-RPC 2.0 over stdio ──────────────────────────────────────────────
type Rpc = { jsonrpc: "2.0"; id?: number | string; method?: string; params?: Record<string, unknown> };

function send(msg: object) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function handle(msg: Rpc) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: (params?.protocolVersion as string) ?? "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "drafter", version: "0.1.0" },
      },
    });
    return;
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") return; // notifications: no reply
  if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });
  if (method === "tools/list") {
    return send({ jsonrpc: "2.0", id, result: { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) } });
  }
  if (method === "tools/call") {
    const tool = TOOLS.find((t) => t.name === params?.name);
    if (!tool) return send({ jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${params?.name}` } });
    try {
      const text = tool.handler((params?.arguments as Record<string, unknown>) ?? {});
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } });
    } catch (e) {
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `Error: ${(e as Error).message}` }], isError: true } });
    }
  }
  if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } });
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  buffer += chunk;
  let idx: number;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line) as Rpc);
    } catch (e) {
      log("parse error:", (e as Error).message);
    }
  }
});
process.stdin.on("end", () => process.exit(0));

log(`Drafter MCP server ready. root=${ROOT}, tools=${TOOLS.length}`);
