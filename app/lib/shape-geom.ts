import type { ShapeKind } from "./board-store";

export type ShapeGeom =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "polygon"; points: string }
  | { kind: "path"; d: string }
  | { kind: "rect"; rx: number };

const STROKE = 2;

function poly(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

/** Points of a regular N-gon inscribed in the bbox, first point at 12 o'clock. */
function regularPolygon(w: number, h: number, n: number): Array<[number, number]> {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

/** 10-point star: outer vertex at 12, alternating inner at `innerRatio`. */
function starPoints(w: number, h: number, innerRatio = 0.45): Array<[number, number]> {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const f = i % 2 === 0 ? 1 : innerRatio;
    pts.push([cx + rx * f * Math.cos(a), cy + ry * f * Math.sin(a)]);
  }
  return pts;
}

/** Build geometry for a shape kind sized into a w × h box. */
export function shapeGeometry(kind: ShapeKind, w: number, h: number): ShapeGeom {
  const pad = STROKE / 2;
  const iw = Math.max(0, w - STROKE);
  const ih = Math.max(0, h - STROKE);

  switch (kind) {
    case "rectangle":
      return { kind: "rect", rx: 0 };
    case "rounded":
      return { kind: "rect", rx: Math.min(16, Math.min(w, h) * 0.1) };
    case "oval":
      return { kind: "ellipse", cx: w / 2, cy: h / 2, rx: iw / 2, ry: ih / 2 };
    case "triangle":
      return {
        kind: "polygon",
        points: poly([
          [w / 2, pad],
          [w - pad, h - pad],
          [pad, h - pad],
        ]),
      };
    case "rhombus":
      return {
        kind: "polygon",
        points: poly([
          [w / 2, pad],
          [w - pad, h / 2],
          [w / 2, h - pad],
          [pad, h / 2],
        ]),
      };
    case "pentagon":
      return { kind: "polygon", points: poly(regularPolygon(w, h, 5)) };
    case "hexagon":
      // Flat-top hexagon feels more "diagram-y".
      return {
        kind: "polygon",
        points: poly([
          [w * 0.25, pad],
          [w * 0.75, pad],
          [w - pad, h / 2],
          [w * 0.75, h - pad],
          [w * 0.25, h - pad],
          [pad, h / 2],
        ]),
      };
    case "octagon": {
      const o = 0.293;
      return {
        kind: "polygon",
        points: poly([
          [w * o, pad],
          [w * (1 - o), pad],
          [w - pad, h * o],
          [w - pad, h * (1 - o)],
          [w * (1 - o), h - pad],
          [w * o, h - pad],
          [pad, h * (1 - o)],
          [pad, h * o],
        ]),
      };
    }
    case "star":
      return { kind: "polygon", points: poly(starPoints(w, h)) };
    case "arrow-right": {
      const bodyTop = h * 0.28;
      const bodyBot = h * 0.72;
      const headStart = w * 0.62;
      return {
        kind: "polygon",
        points: poly([
          [pad, bodyTop],
          [headStart, bodyTop],
          [headStart, h * 0.1],
          [w - pad, h / 2],
          [headStart, h * 0.9],
          [headStart, bodyBot],
          [pad, bodyBot],
        ]),
      };
    }
    case "arrow-left": {
      const bodyTop = h * 0.28;
      const bodyBot = h * 0.72;
      const headEnd = w * 0.38;
      return {
        kind: "polygon",
        points: poly([
          [w - pad, bodyTop],
          [headEnd, bodyTop],
          [headEnd, h * 0.1],
          [pad, h / 2],
          [headEnd, h * 0.9],
          [headEnd, bodyBot],
          [w - pad, bodyBot],
        ]),
      };
    }
    case "double-arrow": {
      const bodyTop = h * 0.32;
      const bodyBot = h * 0.68;
      const leftHead = w * 0.22;
      const rightHead = w * 0.78;
      return {
        kind: "polygon",
        points: poly([
          [pad, h / 2],
          [leftHead, h * 0.1],
          [leftHead, bodyTop],
          [rightHead, bodyTop],
          [rightHead, h * 0.1],
          [w - pad, h / 2],
          [rightHead, h * 0.9],
          [rightHead, bodyBot],
          [leftHead, bodyBot],
          [leftHead, h * 0.9],
        ]),
      };
    }
    case "parallelogram": {
      const slant = Math.min(w * 0.18, h * 0.4);
      return {
        kind: "polygon",
        points: poly([
          [slant, pad],
          [w - pad, pad],
          [w - slant, h - pad],
          [pad, h - pad],
        ]),
      };
    }
    case "trapezoid": {
      const shrink = Math.min(w * 0.18, h * 0.4);
      return {
        kind: "polygon",
        points: poly([
          [shrink, pad],
          [w - shrink, pad],
          [w - pad, h - pad],
          [pad, h - pad],
        ]),
      };
    }
    case "cross": {
      const a = 0.33;
      return {
        kind: "polygon",
        points: poly([
          [w * a, pad],
          [w * (1 - a), pad],
          [w * (1 - a), h * a],
          [w - pad, h * a],
          [w - pad, h * (1 - a)],
          [w * (1 - a), h * (1 - a)],
          [w * (1 - a), h - pad],
          [w * a, h - pad],
          [w * a, h * (1 - a)],
          [pad, h * (1 - a)],
          [pad, h * a],
          [w * a, h * a],
        ]),
      };
    }
    case "callout": {
      const r = Math.min(14, Math.min(w, h) * 0.12);
      const bodyH = h * 0.78;
      // Rounded rect (top part) with a triangular tail at the bottom-left-ish.
      const tailX1 = w * 0.2;
      const tailX2 = w * 0.3;
      const tailY = bodyH;
      const tailTip = h - pad;
      const d = [
        `M ${pad + r} ${pad}`,
        `H ${w - pad - r}`,
        `Q ${w - pad} ${pad} ${w - pad} ${pad + r}`,
        `V ${bodyH - r}`,
        `Q ${w - pad} ${bodyH} ${w - pad - r} ${bodyH}`,
        `H ${tailX2}`,
        `L ${tailX1 * 0.6} ${tailTip}`,
        `L ${tailX1} ${bodyH}`,
        `H ${pad + r}`,
        `Q ${pad} ${bodyH} ${pad} ${tailY - r}`,
        `V ${pad + r}`,
        `Q ${pad} ${pad} ${pad + r} ${pad}`,
        `Z`,
      ].join(" ");
      return { kind: "path", d };
    }
    case "cylinder": {
      const ry = Math.min(h * 0.12, 18);
      const d = [
        `M ${pad} ${ry}`,
        `A ${w / 2 - pad} ${ry} 0 0 1 ${w - pad} ${ry}`,
        `V ${h - ry}`,
        `A ${w / 2 - pad} ${ry} 0 0 1 ${pad} ${h - ry}`,
        `Z`,
        `M ${pad} ${ry}`,
        `A ${w / 2 - pad} ${ry} 0 0 0 ${w - pad} ${ry}`,
      ].join(" ");
      return { kind: "path", d };
    }
    case "cloud": {
      // 4 bumps along the top, 3 along the bottom, made of arcs.
      const d = [
        `M ${w * 0.25} ${h * 0.82}`,
        `C ${w * 0.08} ${h * 0.82}, ${w * 0.02} ${h * 0.6}, ${w * 0.14} ${h * 0.5}`,
        `C ${w * 0.04} ${h * 0.36}, ${w * 0.18} ${h * 0.14}, ${w * 0.34} ${h * 0.22}`,
        `C ${w * 0.42} ${h * 0.02}, ${w * 0.66} ${h * 0.02}, ${w * 0.74} ${h * 0.22}`,
        `C ${w * 0.9} ${h * 0.14}, ${w * 1.0} ${h * 0.36}, ${w * 0.9} ${h * 0.5}`,
        `C ${w * 1.02} ${h * 0.62}, ${w * 0.94} ${h * 0.88}, ${w * 0.78} ${h * 0.82}`,
        `C ${w * 0.72} ${h * 0.96}, ${w * 0.5} ${h * 0.98}, ${w * 0.46} ${h * 0.82}`,
        `C ${w * 0.38} ${h * 0.96}, ${w * 0.22} ${h * 0.94}, ${w * 0.25} ${h * 0.82}`,
        `Z`,
      ].join(" ");
      return { kind: "path", d };
    }
    case "brace-left": {
      const ox = w * 0.5;
      const d = [
        `M ${ox} ${pad}`,
        `Q ${pad} ${pad}, ${pad + 2} ${h * 0.5}`,
        `Q ${pad} ${h - pad}, ${ox} ${h - pad}`,
      ].join(" ");
      return { kind: "path", d };
    }
    case "brace-right": {
      const ox = w * 0.5;
      const d = [
        `M ${ox} ${pad}`,
        `Q ${w - pad} ${pad}, ${w - pad - 2} ${h * 0.5}`,
        `Q ${w - pad} ${h - pad}, ${ox} ${h - pad}`,
      ].join(" ");
      return { kind: "path", d };
    }
  }
}

/** Does this shape kind need its text rendered via an SVG foreignObject
 *  (i.e., the shape is a polygon/path rather than a simple rect)? */
export function isPathShape(kind: ShapeKind): boolean {
  return kind !== "rectangle" && kind !== "rounded";
}

/** Does this shape kind support a filled body, or is it stroke-only? */
export function isStrokeOnly(kind: ShapeKind): boolean {
  return kind === "brace-left" || kind === "brace-right";
}

export const STROKE_W = STROKE;
