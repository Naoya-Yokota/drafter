import { describe, it, expect } from "vitest";
import { isTokenRef, cssVarName, resolveColorToCss, resolveColorToLiteral, tokenRootCss } from "../src/ir/tokens.ts";

const tokens = { colors: { brand: "#2563eb", ink: "#0f172a" } };

describe("tokens", () => {
  it("detects token references", () => {
    expect(isTokenRef("{brand}")).toBe("brand");
    expect(isTokenRef("  {ink}  ")).toBe("ink");
    expect(isTokenRef("#fff")).toBeNull();
    expect(isTokenRef("rgb(0,0,0)")).toBeNull();
    expect(isTokenRef("{a b}")).toBeNull();
  });

  it("builds css var names", () => {
    expect(cssVarName("brand")).toBe("--color-brand");
  });

  it("resolves to css var() with literal fallback", () => {
    expect(resolveColorToCss("{brand}", tokens)).toBe("var(--color-brand, #2563eb)");
    expect(resolveColorToCss("{ghost}", tokens)).toBe("var(--color-ghost)");
    expect(resolveColorToCss("#fff", tokens)).toBe("#fff");
    expect(resolveColorToCss(undefined, tokens)).toBeUndefined();
  });

  it("resolves to a literal for the canvas", () => {
    expect(resolveColorToLiteral("{brand}", tokens)).toBe("#2563eb");
    expect(resolveColorToLiteral("{ghost}", tokens)).toBe("{ghost}"); // unknown falls back to ref text
    expect(resolveColorToLiteral("#fff", tokens)).toBe("#fff");
  });

  it("emits a :root block, or empty string when no colors", () => {
    const css = tokenRootCss(tokens);
    expect(css).toContain(":root");
    expect(css).toContain("--color-brand: #2563eb;");
    expect(tokenRootCss(undefined)).toBe("");
    expect(tokenRootCss({ colors: {} })).toBe("");
  });
});
