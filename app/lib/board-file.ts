"use client";

/**
 * Aedas Board File (.aedas) — canonical, versioned document format.
 *
 * Design goals:
 *  - Portable: a single file round-trips a complete board (items, viewport,
 *    referenced image assets) across local export, cloud sync and future
 *    AI-generated content.
 *  - Versioned: every document carries `schemaVersion`. Loaders must gate on
 *    it and migrate upward; unknown fields (`extensions`, forward-compat keys
 *    on items) must be preserved, never stripped.
 *  - Collab-friendly: items are keyed by stable ids so CRDT / OT overlays can
 *    attach later without reshaping the document. Viewport and selection are
 *    kept separate from item state so per-user ephemeral data doesn't pollute
 *    the canonical board tree.
 *  - AI-friendly: items are flat, typed, and carry their text inline — an
 *    LLM can emit a valid document without understanding internal rendering
 *    details. The only required identity is `{ id, type }` + geometry.
 *
 * On-disk encoding is JSON today (text-diffable, easy to inspect and patch).
 * The schema is the stable contract — a binary or compressed envelope can be
 * added later by introducing a new `format` magic or a `encoding` field while
 * keeping the payload shape identical.
 */

import type { Item } from "./board-store";

/** Magic string — distinguishes our documents from arbitrary JSON. */
export const FILE_FORMAT = "aedas.board" as const;

/** Current schema version. Bump on breaking changes; write a migration for
 *  every older version that should continue to open. */
export const SCHEMA_VERSION = 1 as const;

/** File extension for file pickers / downloads. */
export const FILE_EXTENSION = ".ads" as const;

/** MIME type (unregistered — fine for our own pipelines). */
export const FILE_MIME = "application/vnd.aedas.board+json" as const;

export type BoardFileMeta = {
  /** Stable identifier for this board across renames/moves. */
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** Who last authored this snapshot. Optional — cloud can set authoritatively. */
  author?: { id: string; name?: string; email?: string };
  /** Tool or agent that produced this snapshot (eg. "ui", "ai:diagram-gen"). */
  producedBy?: string;
};

export type BoardFileViewport = {
  pan: { x: number; y: number };
  zoom: number;
};

/** Binary assets referenced by items (primarily image data URLs). Stored
 *  once, keyed by a content hash so duplicated images don't bloat the file.
 *  Items reference assets via `asset://<key>` in place of a raw data URL. */
export type BoardFileAsset = {
  mime: string;
  /** Base64-encoded bytes. */
  data: string;
  /** Optional cached natural dimensions for images. */
  width?: number;
  height?: number;
};

export type BoardFile = {
  format: typeof FILE_FORMAT;
  schemaVersion: number;
  meta: BoardFileMeta;
  viewport?: BoardFileViewport;
  items: Item[];
  assets?: Record<string, BoardFileAsset>;
  /** Forward-compat bucket. Unknown keys must be preserved round-trip. */
  extensions?: Record<string, unknown>;
};

/* ------------------------------------------------------------------ */
/* Serialization                                                      */
/* ------------------------------------------------------------------ */

export type SerializeInput = {
  meta: Pick<BoardFileMeta, "id" | "title"> &
    Partial<Omit<BoardFileMeta, "id" | "title">>;
  items: Item[];
  viewport?: BoardFileViewport;
  /** Pass through any prior extensions to preserve round-trip. */
  extensions?: Record<string, unknown>;
  /** When true, images carrying data:URLs are extracted into the assets
   *  map. Default true — keeps the items tree compact and dedupes images. */
  extractAssets?: boolean;
};

/** Build a BoardFile in memory. Does not stringify — callers decide encoding. */
export function serializeBoard(input: SerializeInput): BoardFile {
  const now = Date.now();
  const extract = input.extractAssets ?? true;

  const assets: Record<string, BoardFileAsset> = {};
  const items = extract
    ? input.items.map((it) => extractImageAsset(it, assets))
    : input.items.map((it) => ({ ...it }));

  return {
    format: FILE_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    meta: {
      id: input.meta.id,
      title: input.meta.title,
      createdAt: input.meta.createdAt ?? now,
      updatedAt: input.meta.updatedAt ?? now,
      author: input.meta.author,
      producedBy: input.meta.producedBy ?? "ui",
    },
    viewport: input.viewport,
    items,
    assets: Object.keys(assets).length > 0 ? assets : undefined,
    extensions: input.extensions,
  };
}

/** Stringify to the on-disk JSON encoding (pretty-printed for diffability). */
export function encodeBoardFile(file: BoardFile): string {
  return JSON.stringify(file, null, 2);
}

/* ------------------------------------------------------------------ */
/* Deserialization                                                    */
/* ------------------------------------------------------------------ */

export type ParseResult =
  | { ok: true; file: BoardFile }
  | { ok: false; error: string };

export function parseBoardFile(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, error: `Not valid JSON: ${(err as Error).message}` };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Root is not an object." };
  }
  const doc = parsed as Record<string, unknown>;

  if (doc.format !== FILE_FORMAT) {
    return {
      ok: false,
      error: `Unexpected format marker: ${String(doc.format)}. Expected "${FILE_FORMAT}".`,
    };
  }

  const version =
    typeof doc.schemaVersion === "number" ? doc.schemaVersion : null;
  if (version === null) {
    return { ok: false, error: "Missing schemaVersion." };
  }
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `File is schemaVersion ${version}; this build understands up to ${SCHEMA_VERSION}. Update the app.`,
    };
  }

  const migrated = migrate(doc, version);

  if (!Array.isArray(migrated.items)) {
    return { ok: false, error: "items must be an array." };
  }
  if (
    !migrated.meta ||
    typeof migrated.meta !== "object" ||
    typeof (migrated.meta as BoardFileMeta).id !== "string"
  ) {
    return { ok: false, error: "meta.id is required." };
  }

  const assets =
    migrated.assets && typeof migrated.assets === "object"
      ? (migrated.assets as Record<string, BoardFileAsset>)
      : undefined;

  const items = migrated.items.map((it) => inlineImageAsset(it as Item, assets));

  return {
    ok: true,
    file: {
      format: FILE_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      meta: migrated.meta as BoardFileMeta,
      viewport: migrated.viewport as BoardFileViewport | undefined,
      items,
      assets,
      extensions: migrated.extensions as Record<string, unknown> | undefined,
    },
  };
}

/** Apply version-to-version migrations. New versions add a `case` here and
 *  mutate the doc in place before handing off to the next step. */
function migrate(doc: Record<string, unknown>, from: number): Record<string, unknown> {
  let current = { ...doc };
  // No migrations yet — schema is at v1. Add cases as the schema evolves.
  for (let v = from; v < SCHEMA_VERSION; v++) {
    // switch (v) { case 1: current = migrateV1toV2(current); break; ... }
    void current;
  }
  return current;
}

/* ------------------------------------------------------------------ */
/* Asset extraction (data URLs <-> asset://)                          */
/* ------------------------------------------------------------------ */

const ASSET_REF_PREFIX = "asset://";

type MaybeImageItem = Item & { type: "image"; src: string };

function isImageItem(it: Item): it is MaybeImageItem {
  return it.type === "image" && typeof (it as { src?: unknown }).src === "string";
}

function extractImageAsset(
  item: Item,
  assets: Record<string, BoardFileAsset>,
): Item {
  if (!isImageItem(item)) return { ...item };
  if (!item.src.startsWith("data:")) return { ...item };
  const parsed = parseDataUrl(item.src);
  if (!parsed) return { ...item };
  const key = hashString(parsed.data);
  if (!assets[key]) {
    assets[key] = {
      mime: parsed.mime,
      data: parsed.data,
      width: item.naturalW,
      height: item.naturalH,
    };
  }
  return { ...item, src: `${ASSET_REF_PREFIX}${key}` };
}

function inlineImageAsset(
  item: Item,
  assets: Record<string, BoardFileAsset> | undefined,
): Item {
  if (!isImageItem(item)) return item;
  if (!item.src.startsWith(ASSET_REF_PREFIX)) return item;
  const key = item.src.slice(ASSET_REF_PREFIX.length);
  const asset = assets?.[key];
  if (!asset) return item; // Dangling reference — leave untouched so failure is visible.
  return {
    ...item,
    src: `data:${asset.mime};base64,${asset.data}`,
    naturalW: item.naturalW ?? asset.width,
    naturalH: item.naturalH ?? asset.height,
  };
}

function parseDataUrl(
  url: string,
): { mime: string; data: string } | null {
  // data:[<mime>];base64,<payload>
  const match = /^data:([^;,]+);base64,(.*)$/.exec(url);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

/** Small non-cryptographic hash — plenty for content-addressing inside one file. */
function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(7, "0");
}

/* ------------------------------------------------------------------ */
/* Browser helpers                                                    */
/* ------------------------------------------------------------------ */

export function downloadBoardFile(file: BoardFile, filename?: string) {
  const name =
    filename ??
    `${(file.meta.title || "board").replace(/[^\w.-]+/g, "-") || "board"}${FILE_EXTENSION}`;
  const blob = new Blob([encodeBoardFile(file)], { type: FILE_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function readBoardFileFromBlob(blob: Blob): Promise<ParseResult> {
  const raw = await blob.text();
  return parseBoardFile(raw);
}
