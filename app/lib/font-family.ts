import type React from "react";
import type { FontFamily } from "./board-store";

/**
 * Resolve a FontFamily id to the class + inline style that should be
 * applied to the text element. Built-in aliases (sans/serif/mono) use
 * Tailwind utilities; Google-Font additions are applied via the CSS
 * variable their next/font loader registered.
 *
 * Shared by `<Sticky>`, `<TextWidget>`, and anything else that renders
 * user-authored text — keeps the rendering consistent across surfaces.
 */
export function fontFamilyProps(family: FontFamily): {
  className: string;
  style?: React.CSSProperties;
} {
  switch (family) {
    case "sans":
      return { className: "font-sans" };
    case "serif":
      return { className: "font-serif" };
    case "mono":
      // Legacy alias — `font-mono` now maps to Inter globally.
      return { className: "font-mono" };
    case "playfair":
      return { className: "", style: { fontFamily: "var(--font-playfair)" } };
    case "lora":
      return { className: "", style: { fontFamily: "var(--font-lora)" } };
    case "poppins":
      return { className: "", style: { fontFamily: "var(--font-poppins)" } };
    case "montserrat":
      return { className: "", style: { fontFamily: "var(--font-montserrat)" } };
    case "space-mono":
      return { className: "", style: { fontFamily: "var(--font-space-mono)" } };
    case "caveat":
      return { className: "", style: { fontFamily: "var(--font-caveat)" } };
  }
}
