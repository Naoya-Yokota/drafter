import { useState, useCallback } from "react";
import type { Document } from "../src/ir/schema.ts";

/**
 * Undo/redo for the document. `commit` records a history step; `replace`
 * mutates the present without one (used during a drag so a whole gesture is a
 * single undo). A drag's first move should `commit` (snapshotting the pre-drag
 * state); subsequent moves `replace`.
 */
type Snapshot = { past: Document[]; present: Document; future: Document[] };

const LIMIT = 200;

export function useHistory() {
  const [h, setH] = useState<Snapshot | null>(null);

  const reset = useCallback((doc: Document) => setH({ past: [], present: doc, future: [] }), []);

  const commit = useCallback((producer: (cur: Document) => Document) => {
    setH((s) => (s ? { past: [...s.past, s.present].slice(-LIMIT), present: producer(s.present), future: [] } : s));
  }, []);

  const replace = useCallback((producer: (cur: Document) => Document) => {
    setH((s) => (s ? { ...s, present: producer(s.present) } : s));
  }, []);

  const undo = useCallback(() => {
    setH((s) => {
      if (!s || s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setH((s) => {
      if (!s || s.future.length === 0) return s;
      const next = s.future[0];
      return { past: [...s.past, s.present], present: next, future: s.future.slice(1) };
    });
  }, []);

  return {
    doc: h?.present ?? null,
    canUndo: (h?.past.length ?? 0) > 0,
    canRedo: (h?.future.length ?? 0) > 0,
    reset,
    commit,
    replace,
    undo,
    redo,
  };
}
