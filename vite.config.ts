import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { spawn } from "node:child_process";
import { parseDocument, type Document, type Node } from "./src/ir/schema.ts";

const ROOT = process.cwd();
const DEFAULT_DESIGN = "examples/design.json";

/** Resolve a client-supplied design path, refusing anything outside the project. */
function safeDesignPath(rawPath: string | null): string {
  const rel = rawPath && rawPath.trim() ? rawPath.trim() : DEFAULT_DESIGN;
  const abs = resolve(ROOT, rel);
  const inside = relative(ROOT, abs);
  if (inside.startsWith("..") || isAbsolute(inside)) {
    throw new Error(`Path escapes project root: ${rel}`);
  }
  return abs;
}

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/**
 * Dev-only file bridge: lets the editor read/write the on-disk design.json so
 * that GUI edits land as real file changes (git- and Claude-Code-friendly),
 * NOT trapped in browser memory. Every write is zod-validated first.
 */
function designApi(): Plugin {
  return {
    name: "drafter-design-api",
    configureServer(server) {
      server.middlewares.use("/api/design", async (req, res) => {
        const send = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        try {
          const url = new URL(req.url ?? "", "http://localhost");
          const path = safeDesignPath(url.searchParams.get("path"));

          if (req.method === "GET") {
            const raw = JSON.parse(readFileSync(path, "utf8"));
            const doc = parseDocument(raw); // validate on read too
            return send(200, { path: relative(ROOT, path), doc });
          }

          if (req.method === "POST") {
            const body = await readBody(req);
            const doc = parseDocument(JSON.parse(body)); // reject invalid IR
            writeFileSync(path, JSON.stringify(doc, null, 2) + "\n", "utf8");
            return send(200, { ok: true, path: relative(ROOT, path) });
          }

          return send(405, { error: `Method ${req.method} not allowed` });
        } catch (e) {
          return send(400, { error: (e as Error).message });
        }
      });
    },
  };
}

function findNode(node: Node, id: string): Node | undefined {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const hit = findNode(c, id);
    if (hit) return hit;
  }
  return undefined;
}

/** Run headless `claude` with a prompt on stdin; resolve with its stdout. */
function runClaude(prompt: string): Promise<string> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn("claude", ["-p"], { shell: true });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      rejectP(new Error("claude timed out (180s)"));
    }, 180_000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      rejectP(new Error(`claude を起動できませんでした（CLI未導入の可能性）: ${e.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolveP(out);
      else rejectP(new Error(`claude exit ${code}: ${err.slice(0, 500)}`));
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/** Pull the first complete JSON object out of an LLM's (possibly noisy) output. */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI出力にJSONが見つかりませんでした");
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Phase 2 (BYOA): resolve a node's open comments by running the user's own
 * headless `claude`. We hand it the whole IR plus the target node + comments and
 * ask for the full updated design.json back, then validate it with zod.
 */
function aiApi(): Plugin {
  return {
    name: "drafter-ai-api",
    configureServer(server) {
      server.middlewares.use("/api/ai-resolve", async (req, res) => {
        const send = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (req.method !== "POST") return send(405, { error: "POST only" });
        try {
          const raw = await readBody(req);
          const { doc, nodeId } = JSON.parse(raw) as { doc: Document; nodeId: string };
          const parsed = parseDocument(doc); // ensure we start from valid IR
          const node = findNode(parsed.root, nodeId);
          if (!node) return send(400, { error: `node ${nodeId} not found` });
          const open = (node.comments ?? []).filter((c) => !c.resolved);
          if (open.length === 0) return send(400, { error: "未解決コメントがありません" });

          const prompt = [
            "あなたはUI設計ツール『Drafter』のIR(中間表現)を編集するアシスタントです。",
            "design.json は絶対配置のUIツリーで、各ノードは {id,type,name,frame{x,y,w,h},style,props,comments,children} を持ちます。",
            "以下の design.json 全体を読み、指定ノードの未解決コメントの指示を反映してください。",
            "制約: ノードのidは変更しない。frame等の数値はキャンバス内に収める。対応したコメントは resolved:true にする。",
            "出力: 更新後の design.json 全体を、前後に説明やコードフェンスを付けず、純粋なJSONのみで返してください。",
            "",
            `対象ノードID: ${nodeId}`,
            `未解決コメント: ${open.map((c) => `「${c.text}」`).join(" / ")}`,
            "",
            "=== 現在の design.json ===",
            JSON.stringify(parsed, null, 2),
          ].join("\n");

          const stdout = await runClaude(prompt);
          const updated = parseDocument(extractJson(stdout)); // validate AI output
          return send(200, { doc: updated });
        } catch (e) {
          return send(400, { error: (e as Error).message });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), designApi(), aiApi()],
  server: { open: true },
});
