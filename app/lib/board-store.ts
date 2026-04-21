import { create } from "zustand";

/* -------- Types -------- */

export type ItemId = string;

type ItemBase = {
  id: ItemId;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  locked?: boolean;
  link?: string;
};

export type StickyItem = ItemBase & {
  type: "sticky";
  text: string;
  color: string;
  textColor: string;
  fontFamily?: FontFamily;
  fontSize?: number;
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  align?: TextAlign;
};

export type ShapeKind =
  | "rectangle"
  | "rounded"
  | "oval"
  | "triangle"
  | "rhombus"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "star"
  | "arrow-right"
  | "arrow-left"
  | "double-arrow"
  | "parallelogram"
  | "trapezoid"
  | "cross"
  | "callout"
  | "cylinder"
  | "cloud"
  | "brace-left"
  | "brace-right";

export type ShapeItem = ItemBase & {
  type: "shape";
  kind: ShapeKind;
  text: string;
  fill: string;
  stroke: string;
};

export type FontFamily = "sans" | "serif" | "mono";
export type TextAlign = "left" | "center" | "right";

export type TextItem = ItemBase & {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily?: FontFamily;
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  align?: TextAlign;
  color?: string;
  serif?: boolean;
  autoSize?: boolean;
};

export type FrameItem = ItemBase & {
  type: "frame";
  title: string;
  fill?: string;
  stroke?: string;
};

export type StrokeItem = ItemBase & {
  type: "stroke";
  points: number[];
  color: string;
  strokeWidth: number;
  tool: "pen" | "highlighter";
};

export type ConnectorEnd =
  | { kind: "item"; itemId: ItemId }
  | { kind: "point"; x: number; y: number };

export type ConnectorVariant = "line" | "arrow" | "elbow" | "block";

export type ConnectorItem = ItemBase & {
  type: "connector";
  from: ConnectorEnd;
  to: ConnectorEnd;
  stroke: string;
  strokeWidth: number;
  arrowEnd: boolean;
  arrowStart?: boolean;
  variant?: ConnectorVariant;
  label?: string;
};

export type CommentMessage = {
  id: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  createdAt: number;
};

export type CommentItem = ItemBase & {
  type: "comment";
  thread: CommentMessage[];
  resolved: boolean;
};

export type ImageItem = ItemBase & {
  type: "image";
  src: string;
  naturalW?: number;
  naturalH?: number;
  alt?: string;
};

export type Item =
  | StickyItem
  | ShapeItem
  | TextItem
  | FrameItem
  | StrokeItem
  | ConnectorItem
  | CommentItem
  | ImageItem;

/* -------- Bounding-box helpers -------- */

export function itemBBox(item: Item) {
  return {
    minX: item.x,
    minY: item.y,
    maxX: item.x + item.w,
    maxY: item.y + item.h,
  };
}

export function rectsIntersect(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

/* -------- Clipboard (module-level, single-tab) -------- */

let _clipboard: Item[] | null = null;
export const getClipboard = () => _clipboard;
export const setClipboard = (items: Item[] | null) => {
  _clipboard = items ? items.map((it) => ({ ...it })) : null;
};

/** Style-only clipboard — captures visual properties of an item so the user
 *  can apply them to another item of the SAME type. */
export type StyleSnapshot =
  | { type: "sticky"; color: string; textColor: string; fontFamily?: FontFamily; fontSize?: number; fontWeight?: number; italic?: boolean; underline?: boolean; align?: TextAlign }
  | { type: "shape"; fill: string; stroke: string }
  | { type: "text"; fontFamily?: FontFamily; fontSize: number; fontWeight?: number; italic?: boolean; underline?: boolean; align?: TextAlign; color?: string }
  | { type: "connector"; stroke: string; strokeWidth: number; variant?: ConnectorVariant; arrowEnd: boolean; arrowStart?: boolean }
  | { type: "frame"; fill?: string; stroke?: string }
  | { type: "stroke"; color: string; strokeWidth: number };

let _styleClipboard: StyleSnapshot | null = null;
export const getStyleClipboard = () => _styleClipboard;
export const setStyleClipboard = (snap: StyleSnapshot | null) => {
  _styleClipboard = snap;
};

/** Pull a StyleSnapshot from a live item (returns null for types without styles). */
export function snapshotStyle(item: Item): StyleSnapshot | null {
  switch (item.type) {
    case "sticky":
      return {
        type: "sticky",
        color: item.color,
        textColor: item.textColor,
        fontFamily: item.fontFamily,
        fontSize: item.fontSize,
        fontWeight: item.fontWeight,
        italic: item.italic,
        underline: item.underline,
        align: item.align,
      };
    case "shape":
      return { type: "shape", fill: item.fill, stroke: item.stroke };
    case "text":
      return {
        type: "text",
        fontFamily: item.fontFamily,
        fontSize: item.fontSize,
        fontWeight: item.fontWeight,
        italic: item.italic,
        underline: item.underline,
        align: item.align,
        color: item.color,
      };
    case "connector":
      return {
        type: "connector",
        stroke: item.stroke,
        strokeWidth: item.strokeWidth,
        variant: item.variant,
        arrowEnd: item.arrowEnd,
        arrowStart: item.arrowStart,
      };
    case "frame":
      return { type: "frame", fill: item.fill, stroke: item.stroke };
    case "stroke":
      return { type: "stroke", color: item.color, strokeWidth: item.strokeWidth };
    default:
      return null;
  }
}

/* -------- Store -------- */

const HISTORY_CAP = 200;

type BoardState = {
  items: Item[];
  selectedIds: string[];
  editingId: ItemId | null;

  history: Item[][];
  future: Item[][];

  /** Selection */
  select: (id: ItemId, additive?: boolean) => void;
  setSelection: (ids: ItemId[]) => void;
  clearSelection: () => void;
  isSelected: (id: ItemId) => boolean;

  /** Editing */
  startEdit: (id: ItemId) => void;
  stopEdit: () => void;
  updateText: (id: ItemId, text: string) => void;

  /** Mutations */
  moveItem: (id: ItemId, x: number, y: number) => void;
  updateItem: (id: ItemId, patch: Partial<Item>) => void;
  addItem: (item: Item) => void;
  removeItem: (id: ItemId) => void;

  /** Selection-wide operations */
  deleteSelected: () => void;
  duplicateSelected: () => void;
  nudgeSelected: (dx: number, dy: number) => void;
  lockSelected: (locked?: boolean) => void;
  toggleLockSelected: () => void;

  /** Z-order */
  bringToFront: (ids?: ItemId[]) => void;
  bringForward: (ids?: ItemId[]) => void;
  sendBackward: (ids?: ItemId[]) => void;
  sendToBack: (ids?: ItemId[]) => void;

  /** Align + distribute (2+ items) */
  alignSelected: (
    how: "left" | "center-h" | "right" | "top" | "middle-v" | "bottom",
  ) => void;
  distributeSelected: (axis: "h" | "v") => void;

  /** Duplicate selection at its current position, return the new ids. */
  duplicateInPlace: () => ItemId[];

  /** Clipboard */
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: (at?: { x: number; y: number }) => void;

  /** Style clipboard */
  copyStyleFromSelection: () => void;
  pasteStyleToSelection: () => void;

  /** Wrap the current selection in a new frame with padding. */
  frameAroundSelection: () => void;

  /** History */
  snapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  /** Introspection */
  contentBBox: () => ReturnType<typeof itemBBox> | null;
};

export const newId = (() => {
  let n = 1000;
  return (prefix: string) => {
    // A monotonically increasing counter alone collides after a page reload
    // (items persisted with id `shape_1001` then a fresh session generates
    // `shape_1001` again). Mix in a short random suffix so ids stay unique
    // across reloads without requiring id reconciliation on hydrate.
    const rand = Math.random().toString(36).slice(2, 6);
    return `${prefix}_${++n}_${rand}`;
  };
})();

export const useBoard = create<BoardState>((set, get) => {
  // Push current items to history, clear redo stack.
  const snapshot = () => {
    const { items, history } = get();
    const next = history.length >= HISTORY_CAP
      ? [...history.slice(1), items]
      : [...history, items];
    set({ history: next, future: [] });
  };

  return {
    items: [],
    selectedIds: [],
    editingId: null,
    history: [],
    future: [],

    select: (id, additive = false) => {
      const { selectedIds } = get();
      if (additive) {
        set({
          selectedIds: selectedIds.includes(id)
            ? selectedIds.filter((s) => s !== id)
            : [...selectedIds, id],
        });
      } else {
        set({ selectedIds: [id] });
      }
    },
    setSelection: (ids) => set({ selectedIds: ids }),
    clearSelection: () => set({ selectedIds: [], editingId: null }),
    isSelected: (id) => get().selectedIds.includes(id),

    startEdit: (id) => set({ editingId: id, selectedIds: [id] }),
    stopEdit: () => {
      const { editingId, items } = get();
      if (!editingId) return;
      const item = items.find((it) => it.id === editingId);
      if (item && item.type === "text" && item.text.trim() === "") {
        snapshot();
        set({
          items: items.filter((it) => it.id !== editingId),
          editingId: null,
          selectedIds: get().selectedIds.filter((s) => s !== editingId),
        });
        return;
      }
      set({ editingId: null });
    },
    // Text updates don't snapshot — too granular. The snapshot is taken when
    // edit mode begins via startEdit callsites that precede it, or can be
    // taken manually by callers who care.
    updateText: (id, text) =>
      set({
        items: get().items.map((it) => {
          if (it.id !== id) return it;
          if (it.type === "sticky" || it.type === "text" || it.type === "shape") {
            return { ...it, text };
          }
          return it;
        }),
      }),

    moveItem: (id, x, y) =>
      set({
        items: get().items.map((it) => (it.id === id ? { ...it, x, y } : it)),
      }),

    updateItem: (id, patch) =>
      set({
        items: get().items.map((it) =>
          it.id === id ? ({ ...it, ...patch } as Item) : it,
        ),
      }),

    addItem: (item) => {
      snapshot();
      set({ items: [...get().items, item] });
    },

    removeItem: (id) => {
      snapshot();
      set({
        items: get().items.filter((it) => it.id !== id),
        selectedIds: get().selectedIds.filter((s) => s !== id),
        editingId: get().editingId === id ? null : get().editingId,
      });
    },

    deleteSelected: () => {
      const sel = new Set(get().selectedIds);
      if (sel.size === 0) return;
      snapshot();
      set({
        items: get().items.filter((it) => !sel.has(it.id) || it.locked),
        selectedIds: [],
        editingId:
          get().editingId && sel.has(get().editingId!)
            ? null
            : get().editingId,
      });
    },

    duplicateSelected: () => {
      const sel = new Set(get().selectedIds);
      if (sel.size === 0) return;
      snapshot();
      const copies = get()
        .items.filter((it) => sel.has(it.id))
        .map((it) => ({
          ...it,
          id: newId(it.type),
          x: it.x + 30,
          y: it.y + 30,
        }));
      set({
        items: [...get().items, ...copies],
        selectedIds: copies.map((c) => c.id),
      });
    },

    nudgeSelected: (dx, dy) => {
      const sel = new Set(get().selectedIds);
      if (sel.size === 0) return;
      snapshot();
      set({
        items: get().items.map((it) =>
          sel.has(it.id) && !it.locked ? { ...it, x: it.x + dx, y: it.y + dy } : it,
        ),
      });
    },

    lockSelected: (locked = true) => {
      const sel = new Set(get().selectedIds);
      if (sel.size === 0) return;
      snapshot();
      set({
        items: get().items.map((it) =>
          sel.has(it.id) ? { ...it, locked } : it,
        ),
      });
    },

    toggleLockSelected: () => {
      const sel = new Set(get().selectedIds);
      if (sel.size === 0) return;
      const items = get().items;
      const selected = items.filter((it) => sel.has(it.id));
      const allLocked = selected.every((it) => it.locked);
      get().lockSelected(!allLocked);
    },

    bringToFront: (ids) => {
      const sel = new Set(ids ?? get().selectedIds);
      if (sel.size === 0) return;
      const items = get().items;
      const moving = items.filter((it) => sel.has(it.id));
      if (moving.length === 0) return;
      snapshot();
      const rest = items.filter((it) => !sel.has(it.id));
      set({ items: [...rest, ...moving] });
    },

    sendToBack: (ids) => {
      const sel = new Set(ids ?? get().selectedIds);
      if (sel.size === 0) return;
      const items = get().items;
      const moving = items.filter((it) => sel.has(it.id));
      if (moving.length === 0) return;
      snapshot();
      const rest = items.filter((it) => !sel.has(it.id));
      set({ items: [...moving, ...rest] });
    },

    bringForward: (ids) => {
      const sel = new Set(ids ?? get().selectedIds);
      if (sel.size === 0) return;
      const items = [...get().items];
      snapshot();
      // Walk right-to-left, swap each selected with its right neighbor if not selected.
      for (let i = items.length - 2; i >= 0; i--) {
        if (sel.has(items[i].id) && !sel.has(items[i + 1].id)) {
          [items[i], items[i + 1]] = [items[i + 1], items[i]];
        }
      }
      set({ items });
    },

    sendBackward: (ids) => {
      const sel = new Set(ids ?? get().selectedIds);
      if (sel.size === 0) return;
      const items = [...get().items];
      snapshot();
      for (let i = 1; i < items.length; i++) {
        if (sel.has(items[i].id) && !sel.has(items[i - 1].id)) {
          [items[i], items[i - 1]] = [items[i - 1], items[i]];
        }
      }
      set({ items });
    },

    alignSelected: (how) => {
      const sel = new Set(get().selectedIds);
      if (sel.size < 2) return;
      const targets = get().items.filter(
        (it) => sel.has(it.id) && !it.locked && it.type !== "connector",
      );
      if (targets.length < 2) return;
      const boxes = targets.map(itemBBox);
      const minX = Math.min(...boxes.map((b) => b.minX));
      const maxX = Math.max(...boxes.map((b) => b.maxX));
      const minY = Math.min(...boxes.map((b) => b.minY));
      const maxY = Math.max(...boxes.map((b) => b.maxY));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      snapshot();
      const patches = new Map<ItemId, { x: number; y: number }>();
      for (const it of targets) {
        let nx = it.x;
        let ny = it.y;
        if (how === "left") nx = minX;
        else if (how === "right") nx = maxX - it.w;
        else if (how === "center-h") nx = cx - it.w / 2;
        else if (how === "top") ny = minY;
        else if (how === "bottom") ny = maxY - it.h;
        else if (how === "middle-v") ny = cy - it.h / 2;
        patches.set(it.id, { x: nx, y: ny });
      }
      set({
        items: get().items.map((it) => {
          const p = patches.get(it.id);
          return p ? { ...it, ...p } : it;
        }),
      });
    },

    distributeSelected: (axis) => {
      const sel = new Set(get().selectedIds);
      if (sel.size < 3) return;
      const targets = get().items.filter(
        (it) => sel.has(it.id) && !it.locked && it.type !== "connector",
      );
      if (targets.length < 3) return;

      // Sort by the axis' top-left edge.
      const sorted = [...targets].sort((a, b) => (axis === "h" ? a.x - b.x : a.y - b.y));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      if (axis === "h") {
        const span = last.x + last.w - first.x;
        const totalW = sorted.reduce((sum, it) => sum + it.w, 0);
        const gap = (span - totalW) / (sorted.length - 1);
        let cursor = first.x;
        snapshot();
        const patches = new Map<ItemId, { x: number }>();
        for (const it of sorted) {
          patches.set(it.id, { x: cursor });
          cursor += it.w + gap;
        }
        set({
          items: get().items.map((it) => {
            const p = patches.get(it.id);
            return p ? { ...it, ...p } : it;
          }),
        });
      } else {
        const span = last.y + last.h - first.y;
        const totalH = sorted.reduce((sum, it) => sum + it.h, 0);
        const gap = (span - totalH) / (sorted.length - 1);
        let cursor = first.y;
        snapshot();
        const patches = new Map<ItemId, { y: number }>();
        for (const it of sorted) {
          patches.set(it.id, { y: cursor });
          cursor += it.h + gap;
        }
        set({
          items: get().items.map((it) => {
            const p = patches.get(it.id);
            return p ? { ...it, ...p } : it;
          }),
        });
      }
    },

    duplicateInPlace: () => {
      const sel = new Set(get().selectedIds);
      if (sel.size === 0) return [];
      snapshot();
      const copies = get()
        .items.filter((it) => sel.has(it.id))
        .map((it) => ({ ...it, id: newId(it.type), locked: false }));
      set({
        items: [...get().items, ...copies],
        selectedIds: copies.map((c) => c.id),
      });
      return copies.map((c) => c.id);
    },

    copySelection: () => {
      const sel = new Set(get().selectedIds);
      if (sel.size === 0) return;
      const copied = get().items.filter((it) => sel.has(it.id));
      setClipboard(copied);
    },

    cutSelection: () => {
      const sel = new Set(get().selectedIds);
      if (sel.size === 0) return;
      const copied = get().items.filter((it) => sel.has(it.id));
      setClipboard(copied);
      snapshot();
      set({
        items: get().items.filter((it) => !sel.has(it.id) || it.locked),
        selectedIds: [],
      });
    },

    copyStyleFromSelection: () => {
      const sel = get().selectedIds;
      if (sel.length === 0) return;
      const first = get().items.find((it) => sel.includes(it.id));
      if (!first) return;
      const snap = snapshotStyle(first);
      if (snap) setStyleClipboard(snap);
    },

    pasteStyleToSelection: () => {
      const snap = getStyleClipboard();
      if (!snap) return;
      const sel = new Set(get().selectedIds);
      if (sel.size === 0) return;
      snapshot();
      set({
        items: get().items.map((it) => {
          if (!sel.has(it.id)) return it;
          if (it.type !== snap.type) return it;
          // TypeScript narrows via the type check above — spread the snap
          // excluding its own `type` discriminator.
          const { type: _type, ...rest } = snap;
          void _type;
          return { ...it, ...rest } as Item;
        }),
      });
    },

    frameAroundSelection: () => {
      const sel = new Set(get().selectedIds);
      if (sel.size === 0) return;
      const boxes = get()
        .items.filter(
          (it) =>
            sel.has(it.id) && it.type !== "connector" && it.type !== "comment",
        )
        .map(itemBBox);
      if (boxes.length === 0) return;
      const pad = 40;
      const minX = Math.min(...boxes.map((b) => b.minX)) - pad;
      const minY = Math.min(...boxes.map((b) => b.minY)) - pad - 10;
      const maxX = Math.max(...boxes.map((b) => b.maxX)) + pad;
      const maxY = Math.max(...boxes.map((b) => b.maxY)) + pad;
      const frame: Item = {
        id: newId("frame"),
        type: "frame",
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
        rotation: 0,
        title: "Frame",
      };
      snapshot();
      // Put the frame at the START of items[] so it renders under content (the
      // sort helper keeps frames at the bottom, but they appear first among
      // frames — putting it first is fine).
      set({
        items: [frame, ...get().items],
        selectedIds: [frame.id],
      });
    },

    pasteClipboard: (at) => {
      const clip = getClipboard();
      if (!clip || clip.length === 0) return;
      // Offset so the cluster lands near `at` (or 30px offset if none).
      let dx = 30;
      let dy = 30;
      if (at) {
        const boxes = clip.map(itemBBox);
        const minX = Math.min(...boxes.map((b) => b.minX));
        const minY = Math.min(...boxes.map((b) => b.minY));
        const maxX = Math.max(...boxes.map((b) => b.maxX));
        const maxY = Math.max(...boxes.map((b) => b.maxY));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        dx = at.x - cx;
        dy = at.y - cy;
      }
      snapshot();
      const copies = clip.map((it) => ({
        ...it,
        id: newId(it.type),
        x: it.x + dx,
        y: it.y + dy,
        locked: false,
      }));
      set({
        items: [...get().items, ...copies],
        selectedIds: copies.map((c) => c.id),
      });
    },

    snapshot,

    undo: () => {
      const { items, history, future } = get();
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      set({
        history: history.slice(0, -1),
        future: [...future, items],
        items: prev,
        selectedIds: [],
        editingId: null,
      });
    },

    redo: () => {
      const { items, history, future } = get();
      if (future.length === 0) return;
      const next = future[future.length - 1];
      set({
        future: future.slice(0, -1),
        history: [...history, items],
        items: next,
        selectedIds: [],
        editingId: null,
      });
    },

    canUndo: () => get().history.length > 0,
    canRedo: () => get().future.length > 0,

    contentBBox: () => {
      const items = get().items;
      if (items.length === 0) return null;
      const boxes = items.map(itemBBox);
      return {
        minX: Math.min(...boxes.map((b) => b.minX)),
        minY: Math.min(...boxes.map((b) => b.minY)),
        maxX: Math.max(...boxes.map((b) => b.maxX)),
        maxY: Math.max(...boxes.map((b) => b.maxY)),
      };
    },
  };
});
