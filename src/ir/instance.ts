import type { Document, Node } from "./schema.ts";

/**
 * Resolve an Instance node into a concrete subtree of its component definition.
 *
 * The instance "becomes" the component's root: it keeps the component's type,
 * style, props, layout and children, but takes the INSTANCE's frame for
 * placement/size. Per-instance `overrides` (keyed by the inner node's original
 * id) are merged in, and every id is namespaced `${instanceId}__${innerId}` so
 * the same component can appear many times without id collisions.
 *
 * Pure and shared by every consumer (HTML codegen, React codegen, the canvas),
 * so an instance looks identical everywhere. Returns null if the component is
 * missing — callers render a visible placeholder instead.
 */
export function materializeInstance(doc: Document, instance: Node): Node | null {
  const def = doc.components?.[instance.componentId ?? ""];
  if (!def) return null;
  const prefix = `${instance.id}__`;
  const overrides = instance.overrides ?? {};

  const transform = (n: Node, isTop: boolean): Node => {
    const ov = overrides[n.id];
    return {
      ...n,
      id: prefix + n.id,
      // The top node inherits the instance's placement; inner nodes keep theirs.
      frame: isTop ? { ...instance.frame } : { ...n.frame },
      style: ov?.style ? { ...n.style, ...ov.style } : n.style,
      props: ov?.props ? { ...n.props, ...ov.props } : n.props,
      children: n.children?.map((c) => transform(c, false)),
    };
  };

  return transform(def.root, true);
}

/** Text-bearing inner nodes of a component, for the instance override UI. */
export function instanceOverrideTargets(doc: Document, instance: Node): Node[] {
  const def = doc.components?.[instance.componentId ?? ""];
  if (!def) return [];
  const out: Node[] = [];
  const visit = (n: Node) => {
    if (n.props?.text != null || n.props?.label != null || n.props?.title != null) out.push(n);
    for (const c of n.children ?? []) visit(c);
  };
  visit(def.root);
  return out;
}
