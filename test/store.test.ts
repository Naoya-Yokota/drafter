import { describe, it, expect } from "vitest";
import type { Node, Document } from "../src/ir/schema.ts";
import { groupNodes, ungroupNode, reorder, findNode, findParent, absoluteOrigin, createComponentFromSelection, reparentNode } from "../editor/store.ts";

function leaf(id: string, x: number, y: number, w = 20, h = 20): Node {
  return { id, type: "Rectangle", frame: { x, y, w, h } };
}

const root: Node = {
  id: "root",
  type: "Frame",
  frame: { x: 0, y: 0, w: 200, h: 200 },
  children: [leaf("a", 10, 10), leaf("b", 50, 50), leaf("c", 90, 90)],
};

describe("store pure ops", () => {
  it("groups nodes into a wrapping frame at the bounding box", () => {
    const res = groupNodes(root, ["a", "b"])!;
    expect(res).not.toBeNull();
    const group = findNode(res.root, res.groupId)!;
    expect(group.frame).toEqual({ x: 10, y: 10, w: 60, h: 60 }); // bbox of a(10,10,20) + b(50,50,20)
    expect(group.children?.map((c) => c.id).sort()).toEqual(["a", "b"]);
    // children become relative to the group origin
    expect(findNode(res.root, "a")!.frame).toMatchObject({ x: 0, y: 0 });
    expect(findNode(res.root, "b")!.frame).toMatchObject({ x: 40, y: 40 });
  });

  it("ungroup lifts children back with absolute coords restored", () => {
    const grouped = groupNodes(root, ["a", "b"])!;
    const back = ungroupNode(grouped.root, grouped.groupId)!;
    expect(absoluteOrigin(back.root, "a")).toEqual({ x: 10, y: 10 });
    expect(absoluteOrigin(back.root, "b")).toEqual({ x: 50, y: 50 });
  });

  it("group requires at least two real nodes", () => {
    expect(groupNodes(root, ["a"])).toBeNull();
  });

  it("reorder moves a node to front (last in paint order)", () => {
    const next = reorder(root, "a", "front");
    expect(next.children?.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("reorder back moves a node to index 0", () => {
    const next = reorder(root, "c", "back");
    expect(next.children?.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });
});

const doc: Document = {
  version: "0.1",
  name: "T",
  canvas: { width: 200, height: 200, background: "#fff" },
  root: {
    id: "root",
    type: "Frame",
    frame: { x: 0, y: 0, w: 200, h: 200 },
    children: [
      leaf("a", 10, 10),
      { id: "box", type: "Frame", frame: { x: 100, y: 100, w: 80, h: 80 }, children: [] },
    ],
  },
};

describe("components & reparent", () => {
  it("creates a component from a single node and replaces it with an instance", () => {
    const res = createComponentFromSelection(doc, ["a"])!;
    expect(res).not.toBeNull();
    const def = res.doc.components![res.componentId];
    expect(def.root.frame).toMatchObject({ x: 0, y: 0, w: 20, h: 20 }); // root reset to origin
    const inst = findNode(res.doc.root, res.instanceId)!;
    expect(inst.type).toBe("Instance");
    expect(inst.componentId).toBe(res.componentId);
    expect(inst.frame).toMatchObject({ x: 10, y: 10 }); // instance keeps original placement
    expect(findNode(res.doc.root, "a")).toBeUndefined(); // original removed
  });

  it("wraps multiple nodes into a component at their bounding box", () => {
    const multi = createComponentFromSelection(
      { ...doc, root: { ...doc.root, children: [leaf("a", 10, 10), leaf("b", 60, 50)] } },
      ["a", "b"],
    )!;
    const def = multi.doc.components![multi.componentId];
    expect(def.root.type).toBe("Frame");
    expect(def.root.frame).toMatchObject({ x: 0, y: 0, w: 70, h: 60 }); // bbox 10..80 x, 10..70 y
    expect(def.root.children?.length).toBe(2);
  });

  it("reparents a node into a frame, converting its coordinates", () => {
    const next = reparentNode(doc.root, "a", "box")!;
    expect(next).not.toBeNull();
    expect(findParent(next, "a")?.id).toBe("box");
    // a was at abs (10,10); box at (100,100) => relative (-90,-90), stays put on screen
    expect(absoluteOrigin(next, "a")).toEqual({ x: 10, y: 10 });
  });

  it("refuses to reparent a node into itself or a descendant", () => {
    expect(reparentNode(doc.root, "box", "box")).toBeNull();
    const withChild = reparentNode(doc.root, "a", "box")!;
    expect(reparentNode(withChild, "box", "a")).toBeNull(); // box -> its own child a
  });
});
