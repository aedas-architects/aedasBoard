"use client";

import {
  ArrowUp,
  ChevronDown,
  Globe,
  Grid3x3,
  Image as ImageIcon,
  Maximize2,
  MoreVertical,
  Sparkles,
  Table as TableIcon,
  Type as TypeIcon,
  Workflow,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { newId, useBoard, type Item } from "../lib/board-store";
import { useViewport } from "../lib/viewport-store";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SUGGESTIONS = [
  "Suggest actionable tasks",
  "Design workshop agenda",
  "Summarize team update",
  "Cluster and rank feedback",
];

function firstNameFromEmail(email?: string) {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? "";
  if (!first) return "there";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Re-id items so AI-generated ids don't collide with existing ones. Fix
 *  connector endpoint references to the remapped ids. */
// Keep in sync with ShapeKind in board-store / shape-geom. Anything outside
// this set renders as an empty SVG and could crash the geometry helpers.
const SUPPORTED_SHAPE_KINDS = new Set([
  "rectangle", "rounded", "oval", "triangle", "rhombus", "pentagon",
  "hexagon", "octagon", "star", "arrow-right", "arrow-left", "double-arrow",
  "parallelogram", "trapezoid", "cross", "callout", "cylinder", "cloud",
  "brace-left", "brace-right",
]);
const SUPPORTED_ITEM_TYPES = new Set([
  "sticky", "text", "shape", "frame", "stroke", "connector", "comment", "image", "group",
]);

function remapItems(raw: unknown[]): Item[] {
  const idMap = new Map<string, string>();
  const first: Item[] = [];
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== "object") continue;
    const c = candidate as Partial<Item> & { id?: string; kind?: string };
    if (!c.type || !SUPPORTED_ITEM_TYPES.has(c.type)) continue;
    // Fall back any unsupported shape kind to `rectangle` so a model that
    // hallucinates (e.g. "heart") can't blow up the geometry renderer.
    if (c.type === "shape" && c.kind && !SUPPORTED_SHAPE_KINDS.has(c.kind)) {
      (c as { kind: string }).kind = "rectangle";
    }
    const fresh = newId(c.type);
    if (c.id) idMap.set(c.id, fresh);
    first.push({ ...(c as Item), id: fresh, rotation: c.rotation ?? 0 });
  }
  return first.map((it) => {
    if (it.type !== "connector") return it;
    const fix = (end: typeof it.from) =>
      end?.kind === "item" && idMap.has(end.itemId)
        ? { kind: "item" as const, itemId: idMap.get(end.itemId)! }
        : end;
    return { ...it, from: fix(it.from), to: fix(it.to) };
  });
}

type Message = { role: "user" | "assistant"; content: string; error?: boolean };

type SymbolMode = {
  label: string;
  hint: string;
};

const SYMBOL_MODES: SymbolMode[] = [
  { label: "Diagram", hint: "Create a diagram of: " },
  { label: "Document", hint: "Write a document about: " },
  { label: "Image", hint: "Describe an image showing: " },
  { label: "Frame", hint: "Create a frame layout for: " },
  { label: "Mobile frame", hint: "Create a mobile screen for: " },
  { label: "Connector", hint: "Create a flow with connectors for: " },
  { label: "Sticky", hint: "Add sticky notes for: " },
  { label: "Table", hint: "Create a table showing: " },
  { label: "Flow", hint: "Design a workflow for: " },
];

export function AiGenerateDialog({ open, onClose }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedIds = useBoard((s) => s.selectedIds);
  const hasSelection = selectedIds.length > 0;

  const greetName =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_USER_NAME) ||
    firstNameFromEmail(
      typeof process !== "undefined" ? process.env.NEXT_PUBLIC_USER_EMAIL : undefined,
    );

  useEffect(() => {
    if (!open) {
      setLoading(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  // Scroll to bottom whenever messages change.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-grow the textarea.
  const autoResize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const submit = async (overridePrompt?: string) => {
    const trimmed = (overridePrompt ?? prompt).trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setPrompt("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);

    try {
      const { pan, zoom } = useViewport.getState();
      const existing = useBoard.getState().items;
      const anchor = { x: (40 - pan.x) / zoom, y: (120 - pan.y) / zoom };

      const selectedItems = existing.filter((it) => selectedIds.includes(it.id));
      const contextSuffix =
        selectedItems.length > 0
          ? `\n\nCurrent selection (use this as context):\n${JSON.stringify(selectedItems, null, 2)}`
          : "";

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed + contextSuffix, anchor, existingCount: existing.length }),
      });

      const data = (await res.json()) as {
        items?: unknown[];
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);

      // Model explicitly declined (empty items + message). Surface the
      // explanation in the chat without treating it as an error.
      if (Array.isArray(data.items) && data.items.length === 0 && data.message) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message! },
        ]);
        return;
      }

      if (!Array.isArray(data.items) || data.items.length === 0)
        throw new Error("The model didn't return any items.");

      const items = remapItems(data.items);
      if (items.length === 0) throw new Error("None of the returned items were valid.");

      const { addItem, setSelection } = useBoard.getState();
      for (const item of items) addItem(item);
      setSelection(items.map((it) => it.id));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Generated ${items.length} item${items.length > 1 ? "s" : ""} on the canvas.` },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: (err as Error).message, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const applySymbolMode = (hint: string) => {
    const next = prompt.startsWith(hint) ? prompt : hint + prompt;
    setPrompt(next);
    inputRef.current?.focus();
    setTimeout(autoResize, 0);
  };

  // The toolbar parent has a CSS transform, which makes `position: fixed`
  // resolve against the toolbar box instead of the viewport. Portal out to
  // document.body so the panel truly anchors to the viewport's right edge.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 440, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 440, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-auto fixed right-[14px] top-[72px] bottom-[14px] z-[35] flex w-[380px] max-w-[90vw] flex-col rounded-[var(--r-xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-md)]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2.5">
            <button
              type="button"
              className="flex items-center gap-1 rounded-[var(--r-md)] px-1.5 py-0.5 font-serif text-[18px] italic text-ink hover:bg-panel-soft"
            >
              AeQ
              <ChevronDown size={13} strokeWidth={1.8} className="text-muted" />
            </button>
            <div className="flex-1" />
            <button
              type="button"
              aria-label="New conversation"
              className="rounded-[var(--r-md)] p-1.5 text-ink-soft hover:bg-panel-soft"
              title="New conversation"
            >
              <Maximize2 size={14} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label="History"
              className="rounded-[var(--r-md)] p-1.5 text-ink-soft hover:bg-panel-soft"
              title="History"
            >
              <Grid3x3 size={14} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label="More"
              className="rounded-[var(--r-md)] p-1.5 text-ink-soft hover:bg-panel-soft"
            >
              <MoreVertical size={14} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-[var(--r-md)] p-1.5 text-ink-soft hover:bg-panel-soft"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 pb-3 pt-6">
            {messages.length === 0 ? (
              <>
                <div
                  className="mb-3 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-[var(--shadow-sm)]"
                  style={{ background: "linear-gradient(135deg, var(--accent) 0%, #c97a1f 100%)" }}
                >
                  <Sparkles size={16} strokeWidth={1.8} />
                </div>
                <h2 className="font-serif text-[32px] italic leading-[1.05] text-ink">
                  Hello {greetName}
                </h2>
                <p className="mt-3 text-[13px] leading-[1.55] text-ink-soft">
                  I'm here to collaborate and help you think through problems, create content, and get things done using your canvas as the prompt.
                </p>
                <p className="mt-5 font-serif text-[15px] italic text-ink">I can help:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={loading}
                      onClick={() => void submit(s)}
                      className="rounded-full border border-[var(--line)] bg-panel px-3 py-1.5 text-[12.5px] text-ink hover:bg-panel-soft disabled:opacity-60"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[80%] rounded-[var(--r-lg)] rounded-br-sm bg-ink px-3 py-2 text-[13px] leading-snug text-white">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex items-start gap-2">
                      <div
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ background: "linear-gradient(135deg, var(--accent) 0%, #c97a1f 100%)" }}
                      >
                        <Sparkles size={11} strokeWidth={1.8} />
                      </div>
                      <div
                        className={`max-w-[80%] rounded-[var(--r-lg)] rounded-bl-sm px-3 py-2 text-[13px] leading-snug ${
                          msg.error
                            ? "border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "bg-panel-soft text-ink"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ),
                )}
                {loading && (
                  <div className="flex items-start gap-2">
                    <div
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ background: "linear-gradient(135deg, var(--accent) 0%, #c97a1f 100%)" }}
                    >
                      <Sparkles size={11} strokeWidth={1.8} />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-[var(--r-lg)] rounded-bl-sm bg-panel-soft px-3 py-2.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-muted"
                          style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-[var(--line)] px-3 pb-3 pt-2">
            <div
              className={`mb-2 flex items-center gap-1.5 rounded-[var(--r-md)] border border-dashed border-[var(--line)] px-2 py-1 text-[11.5px] ${
                hasSelection ? "text-ink" : "text-muted"
              }`}
            >
              <div className="flex h-3 w-3 items-center justify-center">
                <span
                  className="block h-2 w-2 rounded-sm border border-current"
                  aria-hidden
                />
              </div>
              {hasSelection
                ? `${selectedIds.length} selected ${
                    selectedIds.length === 1 ? "item" : "items"
                  } will be sent as context`
                : "Select objects on the canvas to add context"}
            </div>

            <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-panel">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); autoResize(); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); }
                }}
                placeholder="What are you working on?"
                rows={1}
                disabled={loading}
                className="no-focus-ring block w-full resize-none bg-transparent px-3 py-2.5 text-[13px] text-ink placeholder:text-muted disabled:opacity-60"
                style={{ outline: "none", minHeight: 40, maxHeight: 160, overflowY: "hidden" }}
              />

              <div className="flex items-center gap-0.5 border-t border-[var(--line)] px-1.5 py-1.5">
                <ToolbarIconButton label="Search the web" onClick={() => applySymbolMode("Search the web for: ")}>
                  <Globe size={13} strokeWidth={1.8} />
                  <ChevronDown size={10} strokeWidth={1.8} className="text-muted" />
                </ToolbarIconButton>
                {SYMBOL_MODES.map((m) => (
                  <ToolbarIconButton key={m.label} label={m.label} onClick={() => applySymbolMode(m.hint)}>
                    {m.label === "Diagram" || m.label === "Flow" ? <Workflow size={13} strokeWidth={1.8} /> :
                     m.label === "Document" ? <TypeIcon size={13} strokeWidth={1.8} /> :
                     m.label === "Image" ? <ImageIcon size={13} strokeWidth={1.8} /> :
                     m.label === "Table" ? <TableIcon size={13} strokeWidth={1.8} /> :
                     m.label === "Frame" ? <span className="inline-block h-3 w-3 rounded-[2px] border border-current" /> :
                     m.label === "Mobile frame" ? <span className="inline-block h-3 w-2 rounded-[2px] border border-current" /> :
                     m.label === "Connector" ? <span className="inline-block h-[1px] w-3 bg-current" /> :
                     <span className="inline-block h-3 w-3 rounded-[2px] border border-current" />}
                  </ToolbarIconButton>
                ))}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={loading || !prompt.trim()}
                  aria-label="Send"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white transition-opacity disabled:opacity-40"
                >
                  <ArrowUp size={13} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );

  if (!portalTarget) return null;
  return createPortal(panel, portalTarget);
}

function ToolbarIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex items-center gap-0.5 rounded-[var(--r-md)] p-1.5 text-ink-soft hover:bg-panel-soft"
    >
      {children}
    </button>
  );
}
