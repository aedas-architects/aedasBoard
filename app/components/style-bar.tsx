"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Copy,
  Italic,
  Minus,
  Plus,
  Trash2,
  Underline,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  useBoard,
  type ConnectorItem,
  type ConnectorVariant,
  type FontFamily,
  type FrameItem,
  type Item,
  type ShapeItem,
  type StickyItem,
  type StrokeItem,
  type TextAlign,
  type TextItem,
} from "../lib/board-store";
import { useTool } from "../lib/tool-store";

const SWATCHES = [
  "var(--sticky-canary)",
  "var(--sticky-peach)",
  "var(--sticky-rose)",
  "var(--sticky-sky)",
  "var(--sticky-sage)",
  "var(--sticky-lilac)",
  "var(--sticky-stone)",
  "var(--sticky-ink)",
];

const FAMILIES: { id: FontFamily; label: string; className: string }[] = [
  { id: "sans", label: "Inter", className: "font-sans" },
  { id: "serif", label: "Instrument", className: "font-serif" },
  { id: "mono", label: "JetBrains", className: "font-mono" },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 56, 72];

const TEXT_COLORS = [
  "var(--ink)",
  "#d94a38",
  "#2e6fdb",
  "#2e8b57",
  "#c97a1f",
  "#8a58c9",
  "#8a8578",
  "#ffffff",
];

const FILL_COLORS = [
  "#FFFFFF",
  "var(--sticky-canary)",
  "var(--sticky-peach)",
  "var(--sticky-rose)",
  "var(--sticky-sky)",
  "var(--sticky-sage)",
  "var(--sticky-lilac)",
  "var(--sticky-stone)",
  "var(--panel-soft)",
  "#2b2b2b",
  "transparent",
];

const STROKE_COLORS = [
  "var(--ink)",
  "#8a8578",
  "#C4BDA8",
  "#d94a38",
  "#2e6fdb",
  "#2e8b57",
  "#c97a1f",
  "#8a58c9",
];

const PEN_COLORS = [
  "#1a1a1a",
  "#D94A38",
  "#2E6FDB",
  "#2E8B57",
  "#C97A1F",
  "#7A4DB8",
];

const STROKE_WIDTHS = [
  { w: 2, label: "Thin" },
  { w: 4, label: "Medium" },
  { w: 8, label: "Thick" },
];

const HIGHLIGHTER_WIDTHS = [
  { w: 12, label: "Thin" },
  { w: 20, label: "Medium" },
  { w: 32, label: "Thick" },
];

const CONNECTOR_VARIANTS: { id: ConnectorVariant; label: string }[] = [
  { id: "line", label: "Line" },
  { id: "arrow", label: "Arrow" },
  { id: "elbow", label: "Elbow" },
  { id: "block", label: "Block" },
];

type TextLikeItem = TextItem | StickyItem;

export function StyleBar() {
  const selectedIds = useBoard((s) => s.selectedIds);
  const items = useBoard((s) => s.items);
  const updateItem = useBoard((s) => s.updateItem);
  const deleteSelected = useBoard((s) => s.deleteSelected);
  const duplicateSelected = useBoard((s) => s.duplicateSelected);

  const activeTool = useTool((s) => s.active);

  const selected = items.filter((it) => selectedIds.includes(it.id));
  const selectedStickies = selected.filter(
    (it): it is StickyItem => it.type === "sticky",
  );
  const selectedTexts = selected.filter(
    (it): it is TextItem => it.type === "text",
  );
  const selectedShapes = selected.filter(
    (it): it is ShapeItem => it.type === "shape",
  );
  const selectedFrames = selected.filter(
    (it): it is FrameItem => it.type === "frame",
  );
  const selectedStrokes = selected.filter(
    (it): it is StrokeItem => it.type === "stroke",
  );
  const selectedConnectors = selected.filter(
    (it): it is ConnectorItem => it.type === "connector",
  );
  const textLike: TextLikeItem[] = [...selectedTexts, ...selectedStickies];

  const showTextControls = textLike.length > 0 || activeTool === "text";
  const showSwatches = selectedStickies.length > 0;
  const showShapeControls = selectedShapes.length > 0;
  const showFrameControls = selectedFrames.length > 0;
  const showStrokeControls = selectedStrokes.length > 0;
  const showConnectorControls = selectedConnectors.length > 0;

  const hasStyleTool =
    activeTool === "pen" || activeTool === "highlighter" || activeTool === "text";
  const visible = selectedIds.length > 0 || hasStyleTool;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="style-bar"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute left-1/2 top-[78px] z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel px-2 py-1.5 shadow-[var(--shadow-md)]"
        >
          {showTextControls && (
            <TextControls items={textLike} updateItem={updateItem} />
          )}

          {showSwatches && (
            <>
              {showTextControls && <span className="h-5 w-px bg-[var(--line)]" />}
              <StickySwatches
                currentColor={selectedStickies[0].color}
                onPick={(color) => {
                  for (const s of selectedStickies) {
                    const textColor =
                      color === "var(--sticky-ink)" ? "#F5F2EC" : "var(--ink)";
                    updateItem(s.id, { color, textColor });
                  }
                }}
              />
            </>
          )}

          {showShapeControls && (
            <>
              <span className="h-5 w-px bg-[var(--line)]" />
              <ShapeControls shapes={selectedShapes} updateItem={updateItem} />
            </>
          )}

          {showFrameControls && (
            <>
              <span className="h-5 w-px bg-[var(--line)]" />
              <FrameControls frames={selectedFrames} updateItem={updateItem} />
            </>
          )}

          {showStrokeControls && (
            <>
              <span className="h-5 w-px bg-[var(--line)]" />
              <StrokeControls strokes={selectedStrokes} updateItem={updateItem} />
            </>
          )}

          {showConnectorControls && (
            <>
              <span className="h-5 w-px bg-[var(--line)]" />
              <ConnectorControls
                connectors={selectedConnectors}
                updateItem={updateItem}
              />
            </>
          )}

          {selectedIds.length > 0 && (
            <>
              <span className="h-5 w-px bg-[var(--line)]" />
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.06 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                onClick={duplicateSelected}
                title="Duplicate (⌘D)"
                aria-label="Duplicate selection"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] text-ink-soft hover:bg-panel-soft"
              >
                <Copy size={15} strokeWidth={1.8} />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.06 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                onClick={deleteSelected}
                title="Delete (Del)"
                aria-label="Delete selection"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                <Trash2 size={15} strokeWidth={1.8} />
              </motion.button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StickySwatches({
  currentColor,
  onPick,
}: {
  currentColor: string;
  onPick: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-1">
      {SWATCHES.map((s) => (
        <motion.button
          key={s}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          onClick={() => onPick(s)}
          className="h-5 w-5 rounded-full border border-[var(--line)]"
          style={{
            background: s,
            boxShadow: s === currentColor ? "0 0 0 2px var(--accent)" : undefined,
          }}
          aria-label={`Sticky color ${s}`}
        />
      ))}
    </div>
  );
}

function colorOf(item: TextLikeItem): string | undefined {
  return item.type === "text" ? item.color : item.textColor;
}

function familyOf(item: TextLikeItem): FontFamily {
  if (item.fontFamily) return item.fontFamily;
  if (item.type === "text" && item.serif) return "serif";
  return "sans";
}

function patchColor(item: TextLikeItem, color: string): Partial<Item> {
  return item.type === "text" ? { color } : { textColor: color };
}

function TextControls({
  items,
  updateItem,
}: {
  items: TextLikeItem[];
  updateItem: (id: string, patch: Partial<Item>) => void;
}) {
  const first = items[0];
  const family: FontFamily = first ? familyOf(first) : "sans";
  const size = first?.fontSize ?? 20;
  const isBold = (first?.fontWeight ?? 500) >= 700;
  const isItalic = !!first?.italic;
  const isUnderline = !!first?.underline;
  const align: TextAlign = first?.align ?? "left";
  const color = first ? colorOf(first) ?? "var(--ink)" : "var(--ink)";

  const [fontOpen, setFontOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const applyAll = (patch: Partial<Item>) => {
    for (const t of items) updateItem(t.id, patch);
  };

  const applyColor = (c: string) => {
    for (const t of items) updateItem(t.id, patchColor(t, c));
  };

  const familyLabel = FAMILIES.find((f) => f.id === family)?.label ?? "Inter";
  const familyClass = FAMILIES.find((f) => f.id === family)?.className ?? "font-sans";

  return (
    <>
      {/* Font family */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setFontOpen((v) => !v);
            setSizeOpen(false);
            setColorOpen(false);
          }}
          className={`flex items-center gap-1 rounded-[var(--r-md)] px-2 py-1 text-[13px] text-ink hover:bg-panel-soft ${familyClass}`}
        >
          <span className="min-w-[60px] text-left">{familyLabel}</span>
          <ChevronDown size={12} className="text-muted" />
        </button>
        {fontOpen && (
          <Dropdown onClose={() => setFontOpen(false)}>
            {FAMILIES.map((f) => (
              <DropItem
                key={f.id}
                active={family === f.id}
                onClick={() => {
                  applyAll({ fontFamily: f.id, serif: undefined });
                  setFontOpen(false);
                }}
                className={f.className}
              >
                {f.label}
              </DropItem>
            ))}
          </Dropdown>
        )}
      </div>

      {/* Font size */}
      <div className="flex items-center gap-0.5">
        <IconBtn
          onClick={() => applyAll({ fontSize: Math.max(8, size - 2) })}
          title="Decrease size"
        >
          <Minus size={13} strokeWidth={2} />
        </IconBtn>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setSizeOpen((v) => !v);
              setFontOpen(false);
              setColorOpen(false);
            }}
            className="flex items-center gap-1 rounded-[var(--r-md)] px-1.5 py-1 text-[13px] font-mono text-ink hover:bg-panel-soft min-w-[34px] justify-center"
          >
            {size}
          </button>
          {sizeOpen && (
            <Dropdown onClose={() => setSizeOpen(false)}>
              {FONT_SIZES.map((s) => (
                <DropItem
                  key={s}
                  active={size === s}
                  onClick={() => {
                    applyAll({ fontSize: s });
                    setSizeOpen(false);
                  }}
                >
                  <span className="font-mono">{s}</span>
                </DropItem>
              ))}
            </Dropdown>
          )}
        </div>
        <IconBtn
          onClick={() => applyAll({ fontSize: Math.min(200, size + 2) })}
          title="Increase size"
        >
          <Plus size={13} strokeWidth={2} />
        </IconBtn>
      </div>

      <span className="h-5 w-px bg-[var(--line)]" />

      <IconBtn
        active={isBold}
        onClick={() => applyAll({ fontWeight: isBold ? 500 : 700 })}
        title="Bold"
      >
        <Bold size={14} strokeWidth={2} />
      </IconBtn>
      <IconBtn
        active={isItalic}
        onClick={() => applyAll({ italic: !isItalic })}
        title="Italic"
      >
        <Italic size={14} strokeWidth={2} />
      </IconBtn>
      <IconBtn
        active={isUnderline}
        onClick={() => applyAll({ underline: !isUnderline })}
        title="Underline"
      >
        <Underline size={14} strokeWidth={2} />
      </IconBtn>

      <span className="h-5 w-px bg-[var(--line)]" />

      <IconBtn
        active={align === "left"}
        onClick={() => applyAll({ align: "left" })}
        title="Align left"
      >
        <AlignLeft size={14} strokeWidth={2} />
      </IconBtn>
      <IconBtn
        active={align === "center"}
        onClick={() => applyAll({ align: "center" })}
        title="Align center"
      >
        <AlignCenter size={14} strokeWidth={2} />
      </IconBtn>
      <IconBtn
        active={align === "right"}
        onClick={() => applyAll({ align: "right" })}
        title="Align right"
      >
        <AlignRight size={14} strokeWidth={2} />
      </IconBtn>

      <span className="h-5 w-px bg-[var(--line)]" />

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setColorOpen((v) => !v);
            setFontOpen(false);
            setSizeOpen(false);
          }}
          title="Text color"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] hover:bg-panel-soft"
        >
          <span className="flex flex-col items-center leading-none">
            <span className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
              A
            </span>
            <span
              className="mt-[1px] h-[3px] w-4 rounded-[1px]"
              style={{ background: color }}
            />
          </span>
        </button>
        {colorOpen && (
          <Dropdown onClose={() => setColorOpen(false)} align="grid">
            <div
              className="p-2"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 24px)",
                gap: 6,
              }}
            >
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    applyColor(c);
                    setColorOpen(false);
                  }}
                  className="h-6 w-6 rounded-full border border-[var(--line)]"
                  style={{
                    background: c,
                    boxShadow: c === color ? "0 0 0 2px var(--accent)" : undefined,
                  }}
                  aria-label={`Text color ${c}`}
                />
              ))}
            </div>
          </Dropdown>
        )}
      </div>
    </>
  );
}

function ShapeControls({
  shapes,
  updateItem,
}: {
  shapes: ShapeItem[];
  updateItem: (id: string, patch: Partial<Item>) => void;
}) {
  const first = shapes[0];
  const fill = first?.fill ?? "#FFFFFF";
  const stroke = first?.stroke ?? "var(--ink)";

  const applyFill = (c: string) => {
    for (const s of shapes) updateItem(s.id, { fill: c });
  };
  const applyStroke = (c: string) => {
    for (const s of shapes) updateItem(s.id, { stroke: c });
  };

  return (
    <>
      <ColorPicker
        label="Fill"
        value={fill}
        options={FILL_COLORS}
        onChange={applyFill}
        renderButton={(v) => (
          <span
            className="h-4 w-4 rounded-full border border-[var(--line)]"
            style={{
              background:
                v === "transparent"
                  ? "repeating-linear-gradient(45deg, #eee 0 4px, #fff 4px 8px)"
                  : v,
            }}
          />
        )}
      />
      <ColorPicker
        label="Border"
        value={stroke}
        options={STROKE_COLORS}
        onChange={applyStroke}
        renderButton={(v) => (
          <span
            className="h-4 w-4 rounded-full border-2"
            style={{ borderColor: v, background: "transparent" }}
          />
        )}
      />
    </>
  );
}

function FrameControls({
  frames,
  updateItem,
}: {
  frames: FrameItem[];
  updateItem: (id: string, patch: Partial<Item>) => void;
}) {
  const first = frames[0];
  const fill = first?.fill ?? "#FFFFFF";

  const applyFill = (c: string) => {
    for (const f of frames) updateItem(f.id, { fill: c });
  };

  return (
    <ColorPicker
      label="Background"
      value={fill}
      options={FILL_COLORS}
      onChange={applyFill}
      renderButton={(v) => (
        <span
          className="h-4 w-4 rounded-[2px] border border-[var(--line)]"
          style={{
            background:
              v === "transparent"
                ? "repeating-linear-gradient(45deg, #eee 0 4px, #fff 4px 8px)"
                : v,
          }}
        />
      )}
    />
  );
}

function StrokeControls({
  strokes,
  updateItem,
}: {
  strokes: StrokeItem[];
  updateItem: (id: string, patch: Partial<Item>) => void;
}) {
  const first = strokes[0];
  const color = first?.color ?? "#1a1a1a";
  const width = first?.strokeWidth ?? 4;
  const isHighlighter = strokes.every((s) => s.tool === "highlighter");
  const widthOptions = isHighlighter ? HIGHLIGHTER_WIDTHS : STROKE_WIDTHS;

  const applyColor = (c: string) => {
    for (const s of strokes) updateItem(s.id, { color: c });
  };
  const applyWidth = (w: number) => {
    for (const s of strokes) updateItem(s.id, { strokeWidth: w });
  };

  return (
    <div className="flex items-center gap-1">
      <ColorPicker
        label="Stroke"
        value={color}
        options={PEN_COLORS}
        onChange={applyColor}
        renderButton={(v) => (
          <span
            className="h-4 w-4 rounded-full border border-[var(--line)]"
            style={{ background: v }}
          />
        )}
      />
      <span className="h-5 w-px bg-[var(--line)]" />
      <StrokeWidthPicker
        widths={widthOptions}
        value={width}
        color={isHighlighter ? `${color}66` : color}
        onChange={applyWidth}
      />
    </div>
  );
}

function ConnectorControls({
  connectors,
  updateItem,
}: {
  connectors: ConnectorItem[];
  updateItem: (id: string, patch: Partial<Item>) => void;
}) {
  const first = connectors[0];
  const color = first?.stroke ?? "#3a3a3a";
  const variant: ConnectorVariant =
    first?.variant ?? (first?.arrowEnd ? "arrow" : "line");

  const applyColor = (c: string) => {
    for (const conn of connectors) updateItem(conn.id, { stroke: c });
  };
  const applyVariant = (v: ConnectorVariant) => {
    for (const conn of connectors) {
      updateItem(conn.id, {
        variant: v,
        arrowEnd: v !== "line",
        strokeWidth: v === "block" ? 3 : 2,
      });
    }
  };

  return (
    <div className="flex items-center gap-1">
      <ColorPicker
        label="Line color"
        value={color}
        options={STROKE_COLORS}
        onChange={applyColor}
        renderButton={(v) => (
          <span
            className="h-4 w-4 rounded-full border border-[var(--line)]"
            style={{ background: v }}
          />
        )}
      />
      <span className="h-5 w-px bg-[var(--line)]" />
      <div className="flex items-center gap-0.5">
        {CONNECTOR_VARIANTS.map((v) => {
          const active = v.id === variant;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => applyVariant(v.id)}
              title={v.label}
              className={`flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] ${
                active ? "bg-ink text-white" : "text-ink-soft hover:bg-panel-soft"
              }`}
              aria-pressed={active}
            >
              <ConnectorVariantGlyph id={v.id} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConnectorVariantGlyph({ id }: { id: ConnectorVariant }) {
  const s = "currentColor";
  switch (id) {
    case "line":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <line
            x1="2"
            y1="11"
            x2="12"
            y2="3"
            stroke={s}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "arrow":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <line
            x1="2"
            y1="11"
            x2="11"
            y2="4"
            stroke={s}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <polygon points="11,4 8.5,4 11,6.5" fill={s} />
        </svg>
      );
    case "elbow":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path
            d="M2 11 L2 4 L11 4"
            stroke={s}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon points="11,4 8.5,2.8 8.5,5.2" fill={s} />
        </svg>
      );
    case "block":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path
            d="M2 8 L8 8 L8 6 L12 9 L8 12 L8 10 L2 10 Z"
            transform="rotate(-30 7 9)"
            fill={s}
          />
        </svg>
      );
  }
}

function StrokeWidthPicker({
  widths,
  value,
  color,
  onChange,
}: {
  widths: { w: number; label: string }[];
  value: number;
  color: string;
  onChange: (w: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {widths.map((opt) => {
        const active = Math.abs(opt.w - value) < 0.5;
        return (
          <button
            key={opt.w}
            type="button"
            onClick={() => onChange(opt.w)}
            title={opt.label}
            className={`flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] ${
              active ? "bg-panel-soft" : "hover:bg-panel-soft"
            }`}
            aria-pressed={active}
          >
            <span
              className="block rounded-full"
              style={{
                width: 18,
                height: Math.min(8, Math.max(2, opt.w / 2)),
                background: color,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

function ColorPicker({
  label,
  value,
  options,
  onChange,
  renderButton,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (c: string) => void;
  renderButton: (v: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={label}
        className="flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] hover:bg-panel-soft"
      >
        {renderButton(value)}
      </button>
      {open && (
        <Dropdown onClose={() => setOpen(false)} align="grid">
          <div
            className="p-2"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 24px)",
              gap: 6,
            }}
          >
            {options.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className="h-6 w-6 rounded-full border border-[var(--line)]"
                style={{
                  background:
                    c === "transparent"
                      ? "repeating-linear-gradient(45deg, #eee 0 4px, #fff 4px 8px)"
                      : c,
                  boxShadow: c === value ? "0 0 0 2px var(--accent)" : undefined,
                }}
                aria-label={`${label} ${c}`}
              />
            ))}
          </div>
        </Dropdown>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  active = false,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] ${
        active ? "bg-ink text-white" : "text-ink-soft hover:bg-panel-soft"
      }`}
    >
      {children}
    </motion.button>
  );
}

function Dropdown({
  children,
  onClose,
  align = "list",
}: {
  children: React.ReactNode;
  onClose: () => void;
  align?: "list" | "grid";
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onPointerDown={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.14 }}
        className={`absolute left-1/2 top-[calc(100%+6px)] z-20 -translate-x-1/2 rounded-[var(--r-xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-md)] ${
          align === "list" ? "min-w-[120px] p-1" : ""
        }`}
      >
        {children}
      </motion.div>
    </>
  );
}

function DropItem({
  children,
  onClick,
  active,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center rounded-[var(--r-md)] px-2 py-1.5 text-left text-[13px] ${
        active ? "bg-panel-soft text-ink" : "text-ink-soft hover:bg-panel-soft"
      } ${className}`}
    >
      {children}
    </button>
  );
}
