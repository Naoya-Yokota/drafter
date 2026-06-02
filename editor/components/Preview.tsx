import { useMemo } from "react";
import type { Document } from "../../src/ir/schema.ts";
import { generateHtml } from "../../src/codegen/html.ts";

/**
 * The proof that the GUI loop needs no AI: this iframe shows the EXACT output of
 * codegen/html.ts (the same function the CLI writes to out/index.html), live as
 * you edit. GUI edit -> IR -> codegen, zero round-trips through a model.
 */
export function Preview({ doc }: { doc: Document }) {
  const html = useMemo(() => generateHtml(doc), [doc]);
  return <iframe className="preview-frame" title="HTML preview" srcDoc={html} />;
}
