"use client";

import { newId, useBoard, type ImageItem } from "./board-store";

const MAX_W = 640;
const IMAGE_URL_RE = /^https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|avif)(?:\?\S*)?$/i;

function loadMeta(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: MAX_W, h: (MAX_W * 3) / 4 });
    img.src = src;
  });
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

/** Insert an image at a world-space point, centered there and scaled to fit. */
export async function insertImageAt(
  src: string,
  at: { x: number; y: number },
  meta?: { w: number; h: number },
  alt = "",
) {
  const { w: nw, h: nh } = meta ?? (await loadMeta(src));
  const ratio = nh / nw || 1;
  const w = Math.min(MAX_W, nw || MAX_W);
  const h = w * ratio;
  const image: ImageItem = {
    id: newId("image"),
    type: "image",
    x: at.x - w / 2,
    y: at.y - h / 2,
    w,
    h,
    rotation: 0,
    src,
    naturalW: nw,
    naturalH: nh,
    alt,
  };
  useBoard.getState().addItem(image);
  useBoard.getState().setSelection([image.id]);
  return image.id;
}

export async function ingestFiles(
  files: FileList | File[] | null,
  at: { x: number; y: number },
) {
  if (!files) return [];
  const out: string[] = [];
  const list = Array.from(files);
  for (const file of list) {
    if (!file.type.startsWith("image/")) continue;
    try {
      const src = await blobToDataURL(file);
      const id = await insertImageAt(src, at, undefined, file.name);
      out.push(id);
      // Cascade multiple drops so they don't pile on top of each other.
      at = { x: at.x + 24, y: at.y + 24 };
    } catch {
      /* skip */
    }
  }
  return out;
}

export function looksLikeImageUrl(s: string) {
  return IMAGE_URL_RE.test(s.trim());
}

export async function ingestClipboard(
  e: ClipboardEvent,
  at: { x: number; y: number },
): Promise<boolean> {
  const items = e.clipboardData?.items;
  if (!items) return false;
  // Image blob takes priority.
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === "file" && it.type.startsWith("image/")) {
      const blob = it.getAsFile();
      if (!blob) continue;
      const src = await blobToDataURL(blob);
      await insertImageAt(src, at);
      return true;
    }
  }
  // Plain text URL that points at an image.
  const text = e.clipboardData?.getData("text/plain")?.trim();
  if (text && looksLikeImageUrl(text)) {
    await insertImageAt(text, at);
    return true;
  }
  return false;
}
