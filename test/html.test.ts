import { describe, it, expect } from "vitest";
import { generateHtml } from "../src/codegen/html.ts";
import { materializeInstance } from "../src/ir/instance.ts";
import { parseDocument, type Document } from "../src/ir/schema.ts";

const doc: Document = parseDocument({
  version: "0.1",
  name: "T",
  canvas: { width: 200, height: 200, background: "{surface}" },
  tokens: { colors: { brand: "#2563eb", surface: "#f8fafc" } },
  components: {
    card: {
      name: "Card",
      root: {
        id: "c_root",
        type: "Frame",
        frame: { x: 0, y: 0, w: 100, h: 60 },
        children: [{ id: "c_btn", type: "Button", frame: { x: 8, y: 8, w: 80, h: 32 }, props: { label: "OK" }, style: { background: "{brand}" } }],
      },
    },
  },
  root: {
    id: "root",
    type: "Frame",
    frame: { x: 0, y: 0, w: 200, h: 200 },
    children: [
      { id: "inst1", type: "Instance", componentId: "card", frame: { x: 10, y: 10, w: 100, h: 60 } },
      { id: "inst2", type: "Instance", componentId: "card", frame: { x: 10, y: 90, w: 100, h: 60 }, overrides: { c_btn: { props: { label: "Go" } } } },
      { id: "broken", type: "Instance", componentId: "nope", frame: { x: 0, y: 0, w: 10, h: 10 } },
    ],
  },
});

describe("html codegen", () => {
  const html = generateHtml(doc);

  it("emits a :root block for tokens", () => {
    expect(html).toContain("--color-brand: #2563eb;");
    expect(html).toContain("--color-surface: #f8fafc;");
  });

  it("resolves color refs to var()", () => {
    expect(html).toContain("var(--color-brand");
  });

  it("namespaces instance inner ids and applies overrides", () => {
    expect(html).toContain('id="inst1__c_btn"');
    expect(html).toContain('id="inst2__c_btn"');
    expect(html).toContain(">Go<"); // overridden label
    expect(html).toContain(">OK<"); // un-overridden label
  });

  it("renders a placeholder for a missing component", () => {
    expect(html).toContain("drafter-missing");
    expect(html).toContain("missing component: nope");
  });

  it("escapes text content", () => {
    const evil = generateHtml(parseDocument({ ...doc, components: undefined, root: { id: "r", type: "Text", frame: { x: 0, y: 0, w: 10, h: 10 }, props: { text: "<script>&" } } }));
    expect(evil).toContain("&lt;script&gt;&amp;");
    expect(evil).not.toContain("<script>&");
  });
});

describe("materializeInstance", () => {
  it("takes the instance frame and namespaces ids", () => {
    const inst = doc.root.children![0];
    const m = materializeInstance(doc, inst)!;
    expect(m.id).toBe("inst1__c_root");
    expect(m.frame).toEqual({ x: 10, y: 10, w: 100, h: 60 });
    expect(m.children?.[0].id).toBe("inst1__c_btn");
  });

  it("returns null for a missing component", () => {
    expect(materializeInstance(doc, doc.root.children![2])).toBeNull();
  });
});
