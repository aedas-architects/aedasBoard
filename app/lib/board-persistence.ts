"use client";

import { useEffect } from "react";
import { newId, useBoard, type Item } from "./board-store";
import { useBoards } from "./boards-store";
import { useChat } from "./chat-store";
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
// Holds the most recent unsaved payload so `beforeunload` can flush it
// synchronously even when the debounce hasn't yet fired.
let _pendingSave: { id: string; items: Item[] } | null = null;

function saveBoard(id: string, items: Item[]) {
  useUI.getState().setSaveStatus("saving");
  _pendingSave = { id, items };

  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    const pending = _pendingSave;
    _pendingSave = null;
    _saveTimer = null;
    if (!pending) return;
    try {
      const res = await fetch(`/api/boards/${pending.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: pending.items }),
        // keepalive lets the request survive a page unload that races the save.
        keepalive: true,
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      useBoards.getState().touchBoard(pending.id);
      useUI.getState().setSaveStatus("saved");
      setTimeout(() => useUI.getState().setSaveStatus("idle"), 3000);
    } catch {
      useUI.getState().setSaveStatus("error");
      setTimeout(() => useUI.getState().setSaveStatus("idle"), 4000);
    }
  }, 300);
}

/** Flush any pending debounced save — used on page unload. */
function flushPendingSave() {
  if (!_pendingSave) return;
  const { id, items } = _pendingSave;
  _pendingSave = null;
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }

  const body = JSON.stringify({ items });
  // sendBeacon is the only reliable way to issue a POST during unload.
  // The server accepts PATCH-style writes via a ?method=PATCH override so
  // this can go through a POST. If sendBeacon isn't available, fall back
  // to fetch with keepalive.
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(`/api/boards/${id}?method=PATCH`, blob);
  } else {
    // Best-effort — fetch may be killed when the page unloads.
    fetch(`/api/boards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => { /* ignore — we're unloading anyway */ });
  }
}

const AUTO_SNAPSHOT_INTERVAL = 5 * 60 * 1000;

/**
 * Hydrate `useBoard` from Cosmos DB for the given board id, and persist
 * items back whenever they change.
 */
export function useBoardPersistence(id: string) {
  useEffect(() => {
    // Note: do NOT guard this effect with a "run-once" ref. React Strict Mode
    // in dev intentionally mounts → unmounts → remounts. A run-once guard
    // makes the second mount skip setup, leaving the board with no subscriber
    // watching for user changes — which silently breaks all saves.

    useSnapshots.getState().clearSnapshots();
    // Chat is per-board — discard messages from any previously-open board.
    useChat.getState().clear();

    // Reset the store to a clean slate before the subscription is set up.
    // This happens *before* subscribe, so it won't trigger a save.
    useBoard.setState({ items: [], selectedIds: [], editingId: null });

    // One-shot guard: true exactly when the next subscribe fire is our own
    // hydration setState. Any real user change flips it back.
    let skipNextSave = false;
    let lastSnapshotAt = Date.now();

    // Capture the "empty sentinel" reference. If, after fetch resolves, the
    // store still holds this exact array, the user hasn't drawn anything and
    // it's safe to overwrite with the fetched items. If it's a different
    // reference, the user drew something during the fetch — preserve it.
    const emptyRef = useBoard.getState().items;

    fetchBoardItems(id).then((items) => {
      if (items === null) return; // fetch failed — don't touch the store
      const currentItems = useBoard.getState().items;
      if (currentItems !== emptyRef) {
        // User drew during hydration. Keep their work and let the normal
        // save cycle persist it. Don't overwrite.
        return;
      }
      const initialItems = dedupeIds(items);
      if (initialItems.length === 0) return; // nothing to hydrate with
      // Suppress the save that the next setState will trigger — this is a
      // load, not a user change.
      skipNextSave = true;
      useBoard.setState({ items: initialItems, selectedIds: [], editingId: null });
      useSnapshots.getState().takeSnapshot(initialItems, "Session start");
    });

    const unsub = useBoard.subscribe((state, prev) => {
      if (state.items === prev.items) return;
      if (skipNextSave) { skipNextSave = false; return; }
      saveBoard(id, state.items);

      const now = Date.now();
      if (now - lastSnapshotAt >= AUTO_SNAPSHOT_INTERVAL) {
        lastSnapshotAt = now;
        useSnapshots.getState().takeSnapshot(state.items);
      }
    });

    const onBeforeUnload = () => { flushPendingSave(); };
    // pagehide covers mobile / bfcache where beforeunload may not fire.
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onBeforeUnload);

    return () => {
      unsub();
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onBeforeUnload);
      // Also flush when the component unmounts via client navigation.
      flushPendingSave();
    };
  }, [id]);
}
