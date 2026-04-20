"use client";

export type GiphyItem = {
  id: string;
  title: string;
  previewUrl: string;
  previewW: number;
  previewH: number;
  fullUrl: string;
  fullW: number;
  fullH: number;
};

type GiphyRendition = { url: string; width: string; height: string };

type RawGiphy = {
  id: string;
  title: string;
  images: {
    fixed_width_small?: GiphyRendition;
    fixed_width?: GiphyRendition;
    downsized_medium?: GiphyRendition;
    downsized?: GiphyRendition;
    original?: GiphyRendition;
  };
};

const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? "";
const BASE = "https://api.giphy.com/v1/gifs";

export function isConfigured() {
  return API_KEY.length > 0;
}

function normalize(raw: RawGiphy): GiphyItem | null {
  const preview = raw.images.fixed_width_small ?? raw.images.fixed_width;
  const full = raw.images.downsized_medium ?? raw.images.downsized ?? raw.images.original;
  if (!preview || !full) return null;
  return {
    id: raw.id,
    title: raw.title || "GIF",
    previewUrl: preview.url,
    previewW: Number(preview.width),
    previewH: Number(preview.height),
    fullUrl: full.url,
    fullW: Number(full.width),
    fullH: Number(full.height),
  };
}

export async function trending(limit = 24, signal?: AbortSignal): Promise<GiphyItem[]> {
  if (!isConfigured()) return [];
  const url = `${BASE}/trending?api_key=${API_KEY}&limit=${limit}&rating=g`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Giphy trending failed: ${res.status}`);
  const json = (await res.json()) as { data: RawGiphy[] };
  return json.data.map(normalize).filter((x): x is GiphyItem => x !== null);
}

export async function search(
  query: string,
  limit = 24,
  signal?: AbortSignal,
): Promise<GiphyItem[]> {
  if (!isConfigured() || !query.trim()) return [];
  const url = `${BASE}/search?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Giphy search failed: ${res.status}`);
  const json = (await res.json()) as { data: RawGiphy[] };
  return json.data.map(normalize).filter((x): x is GiphyItem => x !== null);
}
