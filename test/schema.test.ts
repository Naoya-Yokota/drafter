import { describe, it, expect } from "vitest";
import { parseDocument, type Document } from "../src/ir/schema.ts";

const minimal: Document = {
  version: "0.1",
  name: "T",
  canvas: { width: 100, height: 100, background: "#fff" },
  root: { id: "root", type: "Frame", frame: { x: 0, y: 0, w: 100, h: 100 } },
};

describe("schema", () => {
  it("parses a minimal valid document", () => {
    const doc = parseDocument(minimal);
    expect(doc.name).toBe("T");
    expect(doc.root.type).toBe("Frame");
  });

  it("round-trips through JSON unchanged", () => {
    const doc = parseDocument(minimal);
    const again = parseDocument(JSON.parse(JSON.stringify(doc)));
    expect(again).toEqual(doc);
  });

  it("rejects unknown node types", () => {
    expect(() => parseDocument({ ...minimal, root: { ...minimal.root, type: "Bogus" } })).toThrow();
  });

  it("rejects unknown top-level keys (strict)", () => {
    expect(() => parseDocument({ ...minimal, surprise: 1 })).toThrow();
  });

  it("accepts tokens", () => {
    const doc = parseDocument({ ...minimal, tokens: { colors: { brand: "#2563eb" } } });
    expect(doc.tokens?.colors?.brand).toBe("#2563eb");
  });

  it("accepts components and an Instance node with overrides", () => {
    const doc = parseDocument({
      ...minimal,
      components: { card: { name: "Card", root: { id: "c", type: "Frame", frame: { x: 0, y: 0, w: 10, h: 10 } } } },
      root: {
        ...minimal.root,
        children: [
          {
            id: "i1",
            type: "Instance",
            componentId: "card",
            frame: { x: 0, y: 0, w: 10, h: 10 },
            overrides: { c: { style: { background: "#000" } } },
          },
        ],
      },
    });
    expect(doc.components?.card.name).toBe("Card");
    expect(doc.root.children?.[0].componentId).toBe("card");
  });

  it("rejects a token with a non-string value", () => {
    expect(() => parseDocument({ ...minimal, tokens: { colors: { brand: 5 } } })).toThrow();
  });
});
