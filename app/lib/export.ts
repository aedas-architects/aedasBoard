"use client";

import { itemBBox, type Item } from "./board-store";
import { isStrokeOnly, shapeGeometry } from "./shape-geom";

/** CSS variable → resolved string (for drawing to a canvas). */
function resolveCss(color: string): string {
  if (typeof window === "undefined") return color;
  if (!color.startsWith("var(")) return color;
  const match = color.match(/var\((--[^,)]+)(?:,\s*([^)]+))?\)/);
  if (!match) return color;
  const v = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim();
  return v || match[2] || color;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function slug(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "board"
  );
}

function contentBBox(items: Item[]) {
  const bounded = items.filter(
    (it) => it.type !== "connector" && it.type !== "comment",
  );
  if (bounded.length === 0) return null;
  const boxes = bounded.map(itemBBox);
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

export function exportJSON(boardName: string, items: Item[]) {
  const payload = {
    version: 1,
    name: boardName,
    exportedAt: new Date().toISOString(),
    items,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  download(blob, `${slug(boardName)}.json`);
}

/* ----------------- SVG export ----------------- */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveEnd(
  end: Extract<Item, { type: "connector" }>["from"],
  items: Item[],
): { x: number; y: number } | null {
  if (end.kind === "point") return { x: end.x, y: end.y };
  const it = items.find((i) => i.id === end.itemId);
  if (!it) return null;
  return { x: it.x + it.w / 2, y: it.y + it.h / 2 };
}

export function exportSVG(boardName: string, items: Item[], backgroundColor: string) {
  const svg = buildSVG(items, backgroundColor);
  const body = `<?xml version="1.0" encoding="UTF-8"?>${svg.body}`;
  const blob = new Blob([body], { type: "image/svg+xml;charset=utf-8" });
  download(blob, `${slug(boardName)}.svg`);
}

/* ----------------- PNG export ----------------- */

function svgToPngBlob(svg: string, width: number, height: number, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("no 2d context"));
        return;
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) reject(new Error("png toBlob failed"));
        else resolve(blob);
      }, "image/png");
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(typeof e === "string" ? new Error(e) : new Error("svg image load failed"));
    };
    img.src = url;
  });
}

export async function exportPNG(boardName: string, items: Item[], backgroundColor: string) {
  const svg = buildSVG(items, backgroundColor);
  const blob = await svgToPngBlob(svg.body, svg.width, svg.height, 2);
  download(blob, `${slug(boardName)}.png`);
}

/** Render the given items to a PNG blob and write it to the system clipboard. */
export async function copyItemsAsImage(items: Item[], backgroundColor: string) {
  if (items.length === 0) throw new Error("Nothing to copy.");
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard image copy isn't supported in this browser.");
  }
  const svg = buildSVG(items, backgroundColor);
  const blob = await svgToPngBlob(svg.body, svg.width, svg.height, 2);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

/** Open the board in a new window and trigger the browser's print dialog.
 *  The user can choose "Save as PDF" from there — zero dependencies. */
export function exportPDF(boardName: string, items: Item[], backgroundColor: string) {
  const svg = buildSVG(items, backgroundColor);
  const win = window.open("", "_blank", "width=1024,height=768");
  if (!win) {
    throw new Error("Pop-up blocked — allow pop-ups and try again.");
  }
  const title = esc(boardName);
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>${title}</title>
    <style>
      html, body { margin: 0; padding: 0; background: ${esc(resolveCss(backgroundColor))}; }
      .wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; box-sizing: border-box; }
      svg { max-width: 100%; max-height: 96vh; height: auto; display: block; }
      @media print {
        @page { size: auto; margin: 8mm; }
        html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: transparent; }
        .wrap { padding: 0; min-height: 0; }
        svg { max-height: none; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">${svg.body}</div>
    <script>
      window.addEventListener('load', () => {
        setTimeout(() => {
          window.focus();
          window.print();
        }, 150);
      });
    </script>
  </body>
</html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/** Internal SVG builder shared between exportSVG and exportPNG. */
function buildSVG(items: Item[], backgroundColor: string): { body: string; width: number; height: number } {
  const bbox = contentBBox(items) ?? { minX: 0, minY: 0, maxX: 1200, maxY: 800 };
  const pad = 48;
  const minX = bbox.minX - pad;
  const minY = bbox.minY - pad;
  const w = bbox.maxX - bbox.minX + pad * 2;
  const h = bbox.maxY - bbox.minY + pad * 2;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}" width="${w}" height="${h}">`,
    `<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="${esc(resolveCss(backgroundColor))}"/>`,
  );
  const ordered = [
    ...items.filter((it) => it.type === "frame"),
    ...items.filter((it) => it.type !== "frame"),
  ];

  for (const it of ordered) {
    if (it.type === "frame") {
      const fill = resolveCss(it.fill ?? "#FFFFFF");
      const stroke = resolveCss(it.stroke ?? "#C4BDA8");
      parts.push(
        `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="2" rx="6"/>`,
        `<text x="${it.x}" y="${it.y - 8}" font-family="Inter, sans-serif" font-size="14" fill="#3a3a3a">${esc(it.title)}</text>`,
      );
    } else if (it.type === "sticky") {
      parts.push(
        `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${esc(resolveCss(it.color))}" rx="4"/>`,
        `<foreignObject x="${it.x + 16}" y="${it.y + 16}" width="${it.w - 32}" height="${it.h - 32}"><div xmlns="http://www.w3.org/1999/xhtml" style="font: 500 ${it.fontSize ?? 15}px/1.35 Inter,sans-serif; color:${esc(resolveCss(it.textColor))}; white-space: pre-wrap; word-break: break-word;">${esc(it.text ?? "")}</div></foreignObject>`,
      );
    } else if (it.type === "shape") {
      const strokeOnly = isStrokeOnly(it.kind);
      const fill = strokeOnly ? "none" : esc(resolveCss(it.fill));
      const stroke = esc(resolveCss(it.stroke));
      const geom = shapeGeometry(it.kind, it.w, it.h);
      const common = `fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"`;
      parts.push(`<g transform="translate(${it.x} ${it.y})">`);
      if (geom.kind === "ellipse") {
        parts.push(
          `<ellipse cx="${geom.cx}" cy="${geom.cy}" rx="${geom.rx}" ry="${geom.ry}" ${common}/>`,
        );
      } else if (geom.kind === "polygon") {
        parts.push(`<polygon points="${geom.points}" ${common}/>`);
      } else if (geom.kind === "path") {
        parts.push(`<path d="${geom.d}" ${common}/>`);
      } else {
        parts.push(
          `<rect x="0" y="0" width="${it.w}" height="${it.h}" rx="${geom.rx}" ${common}/>`,
        );
      }
      parts.push(`</g>`);
      if (it.text) {
        parts.push(
          `<foreignObject x="${it.x + 8}" y="${it.y + 8}" width="${it.w - 16}" height="${it.h - 16}"><div xmlns="http://www.w3.org/1999/xhtml" style="font: 500 14px/1.3 Inter,sans-serif; color:#1a1a1a; display:flex; align-items:center; justify-content:center; text-align:center; height:100%;">${esc(it.text)}</div></foreignObject>`,
        );
      }
    } else if (it.type === "text") {
      const color = esc(resolveCss(it.color ?? "#1a1a1a"));
      const family =
        it.fontFamily === "serif"
          ? "Instrument Serif, serif"
          : it.fontFamily === "mono"
          ? "JetBrains Mono, monospace"
          : "Inter, sans-serif";
      parts.push(
        `<foreignObject x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"><div xmlns="http://www.w3.org/1999/xhtml" style="font: ${it.italic ? "italic " : ""}${it.fontWeight ?? 500} ${it.fontSize}px/1.2 ${family}; color:${color}; text-align:${it.align ?? "left"}; text-decoration:${it.underline ? "underline" : "none"}; white-space: pre-wrap;">${esc(it.text ?? "")}</div></foreignObject>`,
      );
    } else if (it.type === "image") {
      parts.push(
        `<image x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" href="${esc(it.src)}" preserveAspectRatio="xMidYMid slice"/>`,
      );
    } else if (it.type === "stroke") {
      const pts: string[] = [];
      for (let i = 0; i < it.points.length; i += 2) {
        pts.push(`${it.x + it.points[i]},${it.y + it.points[i + 1]}`);
      }
      parts.push(
        `<polyline points="${pts.join(" ")}" fill="none" stroke="${esc(resolveCss(it.color))}" stroke-width="${it.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${it.tool === "highlighter" ? `opacity="0.4"` : ""}/>`,
      );
    } else if (it.type === "connector") {
      const from = resolveEnd(it.from, items);
      const to = resolveEnd(it.to, items);
      if (!from || !to) continue;
      const stroke = esc(resolveCss(it.stroke));
      parts.push(
        `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${stroke}" stroke-width="${it.strokeWidth}" stroke-linecap="round"/>`,
      );
      if (it.arrowEnd) {
        const ang = Math.atan2(to.y - from.y, to.x - from.x);
        const headLen = 12;
        const headW = 8;
        const ax = to.x - Math.cos(ang) * headLen;
        const ay = to.y - Math.sin(ang) * headLen;
        const lX = ax - Math.sin(ang) * headW * 0.5;
        const lY = ay + Math.cos(ang) * headW * 0.5;
        const rX = ax + Math.sin(ang) * headW * 0.5;
        const rY = ay - Math.cos(ang) * headW * 0.5;
        parts.push(
          `<polygon points="${to.x},${to.y} ${lX},${lY} ${rX},${rY}" fill="${stroke}"/>`,
        );
      }
    }
  }
  parts.push(`</svg>`);
  return { body: parts.join(""), width: w, height: h };
}
