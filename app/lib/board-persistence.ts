"use client";

import { useEffect, useRef } from "react";
import { useBoard, type Item } from "./board-store";
import { boardItemsKey, useBoards } from "./boards-store";

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
      items: saved?.items ?? [],
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
