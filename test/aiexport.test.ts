import { describe, it, expect } from "vitest";
import { describeDoc } from "../editor/aiexport.ts";
import { parseDocument, type Document } from "../src/ir/schema.ts";

const doc: Document = parseDocument({
  version: "0.1",
  name: "T",
  canvas: { width: 200, height: 200, background: "#fff" },
  tokens: { colors: { brand: "#2563eb" } },
  components: {
    card: {
      name: "Card",
      root: {
        id: "c_root",
        type: "Frame",
        frame: { x: 0, y: 0, w: 100, h: 60 },
        children: [{ id: "c_title", type: "Text", frame: { x: 8, y: 8, w: 80, h: 20 }, props: { text: "Hi" } }],
      },
    },
  },
  root: {
    id: "root",
    type: "Frame",
    frame: { x: 0, y: 0, w: 200, h: 200 },
    children: [
      { id: "i1", type: "Instance", componentId: "card", frame: { x: 10, y: 10, w: 100, h: 60 }, overrides: { c_title: { props: { text: "Hello" } } } },
    ],
  },
});

describe("describeDoc", () => {
  const md = describeDoc(doc);

  it("lists design tokens", () => {
    expect(md).toContain("`{brand}` = #2563eb");
  });

  it("lists components with their structure", () => {
    expect(md).toContain("**Card** (100×60)");
    expect(md).toContain("**Text**"); // the component's inner node is described
    expect(md).toContain("Hi"); // its label
  });

  it("describes instances by component name and overrides", () => {
    expect(md).toContain("Instance");
    expect(md).toContain("Card");
    expect(md).toContain("Hello"); // the override value
  });
});
