import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseDocument, openComments } from "./ir/schema.ts";
import { generateHtml } from "./codegen/html.ts";

/**
 * Drafter CLI — IR -> HTML.
 *
 * Usage:
 *   node src/cli.ts <design.json> [outDir] [--check]
 *
 *   --check : validate the IR and report open (unresolved) comments,
 *             but do not write any files. Handy for CI and for AI agents
 *             to see what still needs work.
 */

function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const positional = args.filter((a) => !a.startsWith("--"));
  const input = positional[0] ?? "examples/design.json";
  const outDir = positional[1] ?? "out";

  const inputPath = resolve(process.cwd(), input);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (e) {
    console.error(`✗ Failed to read/parse ${input}:`, (e as Error).message);
    process.exit(1);
  }

  let doc;
  try {
    doc = parseDocument(raw);
  } catch (e) {
    console.error(`✗ IR validation failed for ${input}:`);
    console.error((e as Error).message);
    process.exit(1);
  }

  console.log(`✓ Valid IR: "${doc.name}" (canvas ${doc.canvas.width}×${doc.canvas.height})`);

  const open = openComments(doc);
  if (open.length) {
    console.log(`\n💬 ${open.length} open comment(s) for the AI to resolve:`);
    for (const { node, comment } of open) {
      console.log(`   - [${node.type} #${node.id}] ${comment.text}`);
    }
  } else {
    console.log("💬 No open comments.");
  }

  if (check) {
    console.log("\n(--check) No files written.");
    return;
  }

  const html = generateHtml(doc);
  const outPath = join(resolve(process.cwd(), outDir), "index.html");
  mkdirSync(resolve(process.cwd(), outDir), { recursive: true });
  writeFileSync(outPath, html, "utf8");
  console.log(`\n→ Wrote ${outPath}`);
}

main();
