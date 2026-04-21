"use client";

import { useEffect, useRef } from "react";
import { newId, useBoard, type Item } from "./board-store";
import { useBoards } from "./boards-store";
import { useSnapshots } from "./snapshot-store";
import { useUI } from "./ui-store";
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

// ---------------------------------------------------------------------------
// API helpers — auth is session-cookie based, no manual headers needed
// ---------------------------------------------------------------------------

async function fetchBoardItems(id: string): Promise<Item[] | null> {
  try {
    const res = await fetch(`/api/boards/${id}`);
    if (!res.ok) return null;
    const doc = await res.json() as { items: Item[] };
    return Array.isArray(doc.items) ? doc.items : null;
  } catch {
    return null;
  }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveBoard(id: string, items: Item[]) {
  useUI.getState().setSaveStatus("saving");

  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await fetch(`/api/boards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      useBoards.getState().touchBoard(id);
      useUI.getState().setSaveStatus("saved");
      setTimeout(() => useUI.getState().setSaveStatus("idle"), 3000);
    } catch {
      useUI.getState().setSaveStatus("idle");
    }
  }, 300);
}

const AUTO_SNAPSHOT_INTERVAL = 5 * 60 * 1000;

/**
 * Hydrate `useBoard` from Cosmos DB for the given board id, and persist
 * items back whenever they change.
 */
export function useBoardPersistence(id: string) {
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (hydratedRef.current === id) return;
    hydratedRef.current = id;

    useSnapshots.getState().clearSnapshots();

    fetchBoardItems(id).then((items) => {
      const initialItems = items ? dedupeIds(items) : [];
      useBoard.setState({ items: initialItems, selectedIds: [], editingId: null });

      if (initialItems.length > 0) {
        useSnapshots.getState().takeSnapshot(initialItems, "Session start");
      }
    });

    let lastSnapshotAt = Date.now();

    const unsub = useBoard.subscribe((state, prev) => {
      if (state.items === prev.items) return;
      saveBoard(id, state.items);

      const now = Date.now();
      if (now - lastSnapshotAt >= AUTO_SNAPSHOT_INTERVAL) {
        lastSnapshotAt = now;
        useSnapshots.getState().takeSnapshot(state.items);
      }
    });

    return () => { unsub(); };
  }, [id]);
}
