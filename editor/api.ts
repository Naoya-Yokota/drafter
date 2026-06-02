import type { Document } from "../src/ir/schema.ts";

/** Load the on-disk design.json through the dev server (validated server-side). */
export async function loadDesign(path?: string): Promise<{ path: string; doc: Document }> {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  const res = await fetch(`/api/design${qs}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Load failed (${res.status})`);
  return body;
}

/** Write the document back to disk (validated server-side before writing). */
export async function saveDesign(doc: Document, path?: string): Promise<string> {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  const res = await fetch(`/api/design${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Save failed (${res.status})`);
  return body.path as string;
}

/**
 * Ask the dev server to resolve the open comment(s) on `nodeId` by running a
 * headless `claude` over the IR. Returns the updated, validated Document.
 */
export async function aiResolve(doc: Document, nodeId: string): Promise<Document> {
  const res = await fetch("/api/ai-resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc, nodeId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `AI resolve failed (${res.status})`);
  return body.doc as Document;
}

/** Generate a brand-new screen from a natural-language prompt (headless claude). */
export async function aiGenerate(prompt: string, width: number, height: number): Promise<Document> {
  const res = await fetch("/api/ai-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, width, height }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `AI generate failed (${res.status})`);
  return body.doc as Document;
}
