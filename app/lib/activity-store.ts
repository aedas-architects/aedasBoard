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
  /** Set once the session is known — log() uses this when writing entries. */
  currentUser: { name: string; initials: string; color: string };
  setCurrentUser: (user: { name: string; initials: string; color: string }) => void;
  log: (action: string, detail?: string) => void;
  clear: () => void;
};

let _counter = 0;

function fallbackInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const useActivity = create<ActivityState>((set, get) => ({
  entries: [],
  currentUser: { name: "You", initials: "YO", color: "#7C3AED" },
  setCurrentUser: (user) => set({ currentUser: user }),
  log: (action, detail) =>
    set((s) => {
      const u = get().currentUser;
      return {
        entries: [
          {
            id: `act-${Date.now()}-${_counter++}`,
            action,
            detail,
            user: u.name,
            initials: u.initials || fallbackInitials(u.name),
            color: u.color,
            timestamp: Date.now(),
          },
          ...s.entries,
        ].slice(0, 200),
      };
    }),
  clear: () => set({ entries: [] }),
}));
