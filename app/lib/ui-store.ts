"use client";

import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type UIState = {
  commandPaletteOpen: boolean;
  templatesOpen: boolean;
  searchOpen: boolean;
  shortcutsOpen: boolean;
  framesPanelOpen: boolean;
  shapesLibraryOpen: boolean;
  exportOpen: boolean;
  historyPanelOpen: boolean;
  presenting: boolean;
  presentationIndex: number;
  /** Incremented to request the TopBar to enter title-edit mode. */
  renameTitleToken: number;
  saveStatus: SaveStatus;
  saveStatusAt: number;
  requestRenameTitle: () => void;
  setCommandPalette: (open: boolean) => void;
  setTemplates: (open: boolean) => void;
  setSearch: (open: boolean) => void;
  setShortcuts: (open: boolean) => void;
  setFramesPanel: (open: boolean) => void;
  setShapesLibrary: (open: boolean) => void;
  setExport: (open: boolean) => void;
  setHistoryPanel: (open: boolean) => void;
  startPresenting: (index?: number) => void;
  stopPresenting: () => void;
  setPresentationIndex: (i: number) => void;
  setSaveStatus: (s: SaveStatus) => void;
};

export const useUI = create<UIState>((set) => ({
  commandPaletteOpen: false,
  templatesOpen: false,
  searchOpen: false,
  shortcutsOpen: false,
  framesPanelOpen: false,
  shapesLibraryOpen: false,
  exportOpen: false,
  historyPanelOpen: false,
  presenting: false,
  presentationIndex: 0,
  renameTitleToken: 0,
  saveStatus: "idle",
  saveStatusAt: 0,
  setSaveStatus: (saveStatus) => set({ saveStatus, saveStatusAt: Date.now() }),
  setCommandPalette: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setTemplates: (templatesOpen) => set({ templatesOpen }),
  setSearch: (searchOpen) => set({ searchOpen }),
  setShortcuts: (shortcutsOpen) => set({ shortcutsOpen }),
  setFramesPanel: (framesPanelOpen) => set({ framesPanelOpen }),
  setShapesLibrary: (shapesLibraryOpen) => set({ shapesLibraryOpen }),
  setExport: (exportOpen) => set({ exportOpen }),
  setHistoryPanel: (historyPanelOpen) => set({ historyPanelOpen }),
  startPresenting: (index = 0) =>
    set({ presenting: true, presentationIndex: index }),
  stopPresenting: () => set({ presenting: false }),
  setPresentationIndex: (presentationIndex) => set({ presentationIndex }),
  requestRenameTitle: () =>
    set((s) => ({ renameTitleToken: s.renameTitleToken + 1 })),
}));
