// Validate every bundled template against the IR schema. Used by CI and `npm run validate`.
import { TEMPLATES } from "../editor/templates.ts";
import { parseDocument } from "../src/ir/schema.ts";

let ok = 0;
const failures = [];
for (const t of TEMPLATES) {
  try {
    parseDocument(t.doc);
    ok += 1;
  } catch (e) {
    failures.push(`✗ ${t.category} / ${t.label}: ${String(e.message).split("\n").slice(0, 2).join(" | ")}`);
  }
}

console.log(`${ok}/${TEMPLATES.length} templates valid`);
if (failures.length) {
  console.error("\n" + failures.join("\n"));
  process.exit(1);
}
