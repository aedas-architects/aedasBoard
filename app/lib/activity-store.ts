"use client";

import { create } from "zustand";

export type ActivityEntry = {
  id: string;
  action: string;
  detail?: string;
  user: string;
  initials: string;
  color: string;
  timestamp: number;
};

type ActivityState = {
  entries: ActivityEntry[];
  log: (action: string, detail?: string) => void;
  clear: () => void;
};

let _counter = 0;

export const useActivity = create<ActivityState>((set) => ({
  entries: [],
  log: (action, detail) =>
    set((s) => ({
      entries: [
        {
          id: `act-${Date.now()}-${_counter++}`,
          action,
          detail,
          user: "Dijo Aedas",
          initials: "DA",
          color: "#7C3AED",
          timestamp: Date.now(),
        },
        ...s.entries,
      ].slice(0, 200),
    })),
  clear: () => set({ entries: [] }),
}));
