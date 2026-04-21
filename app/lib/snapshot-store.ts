"use client";

import { create } from "zustand";
import type { Item } from "./board-store";

export type BoardSnapshot = {
  id: string;
  timestamp: number;
  label?: string;
  itemCount: number;
  /** Full item list at this point in time. */
  items: Item[];
};

type SnapshotState = {
  snapshots: BoardSnapshot[];
  /** Take a new snapshot with an optional label. */
  takeSnapshot: (items: Item[], label?: string) => void;
  /** Remove all snapshots (e.g. on board change). */
  clearSnapshots: () => void;
};

let _snapshotCounter = 0;

export const useSnapshots = create<SnapshotState>((set, get) => ({
  snapshots: [],

  takeSnapshot: (items, label) => {
    const id = `snap-${Date.now()}-${_snapshotCounter++}`;
    const snap: BoardSnapshot = {
      id,
      timestamp: Date.now(),
      label,
      itemCount: items.length,
      items: structuredClone(items),
    };
    set((s) => ({
      // Keep most recent 50 snapshots
      snapshots: [snap, ...s.snapshots].slice(0, 50),
    }));
  },

  clearSnapshots: () => set({ snapshots: [] }),
}));
