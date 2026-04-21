"use client";

import { useEffect, useRef } from "react";
import { newId, useBoard, type Item } from "./board-store";
import { boardItemsKey, useBoards } from "./boards-store";

/** Reassign any duplicate ids we read from storage. Keeps connector endpoints
 *  (item references) pointing at the newly-assigned ids. */
function dedupeIds(items: Item[]): Item[] {
  const seen = new Set<string>();
  const remap = new Map<string, string>();
  const out: Item[] = [];
  for (const it of items) {
    if (!seen.has(it.id)) {
      seen.add(it.id);
      out.push(it);
      continue;
    }
    const fresh = newId(it.type);
    remap.set(it.id, fresh);
    seen.add(fresh);
    out.push({ ...it, id: fresh } as Item);
  }
  if (remap.size === 0) return out;
  return out.map((it) => {
    if (it.type !== "connector") return it;
    const fix = (end: typeof it.from) =>
      end.kind === "item" && remap.has(end.itemId)
        ? { kind: "item" as const, itemId: remap.get(end.itemId)! }
        : end;
    return { ...it, from: fix(it.from), to: fix(it.to) };
  });
}

type Persisted = {
  items: Item[];
};

function readBoard(id: string): Persisted | null {
  try {
    const raw = localStorage.getItem(boardItemsKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeBoard(id: string, data: Persisted) {
  try {
    localStorage.setItem(boardItemsKey(id), JSON.stringify(data));
  } catch {
    /* quota or serialization — non-fatal */
  }
}

/**
 * Hydrate `useBoard` from localStorage for the given board id, and persist
 * items back whenever they change. Call once per board page mount.
 */
export function useBoardPersistence(id: string) {
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (hydratedRef.current === id) return;
    hydratedRef.current = id;

    const saved = readBoard(id);
    useBoard.setState({
      items: saved?.items ? dedupeIds(saved.items) : [],
      selectedIds: [],
      editingId: null,
    });

    // Subscribe to items changes and write-through.
    const unsub = useBoard.subscribe((state, prev) => {
      if (state.items === prev.items) return;
      writeBoard(id, { items: state.items });
      useBoards.getState().touchBoard(id);
    });

    return () => {
      unsub();
    };
  }, [id]);
}
