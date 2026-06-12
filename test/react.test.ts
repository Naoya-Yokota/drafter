import { describe, it, expect } from "vitest";
import { generateReact } from "../src/codegen/react.ts";
import { parseDocument, type Document } from "../src/ir/schema.ts";

const doc: Document = parseDocument({
  version: "0.1",
  name: "T",
  canvas: { width: 200, height: 200, background: "#fff" },
  tokens: { colors: { brand: "#2563eb" } },
  components: {
    card: {
      name: "Feature Card",
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
    ],
  },
});

describe("react codegen", () => {
  const tsx = generateReact(doc);

  it("emits a named component function per definition", () => {
    expect(tsx).toContain("function FeatureCard({ style }: { style?: React.CSSProperties })");
  });

  it("calls the component for a clean instance", () => {
    expect(tsx).toMatch(/<FeatureCard style=\{\{[^}]*left: 10[^}]*top: 10/);
  });

  it("inlines the materialized subtree when an instance has overrides", () => {
    expect(tsx).toContain('{"Go"}');
  });

  it("emits a :root style block and uses var() for token colors", () => {
    expect(tsx).toContain("--color-brand: #2563eb;");
    expect(tsx).toContain("var(--color-brand");
  });

  it("exports a default Screen component", () => {
    expect(tsx).toContain("export default function Screen()");
  });
});
