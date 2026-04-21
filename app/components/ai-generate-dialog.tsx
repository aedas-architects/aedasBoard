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
function remapItems(raw: unknown[]): Item[] {
  const idMap = new Map<string, string>();
  const first: Item[] = [];
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== "object") continue;
    const c = candidate as Partial<Item> & { id?: string };
    if (!c.type) continue;
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

export function AiGenerateDialog({ open, onClose }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedIds = useBoard((s) => s.selectedIds);
  const hasSelection = selectedIds.length > 0;

  // Simple greeting — ENV can override, otherwise fall back to email-derived name.
  const greetName =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_USER_NAME) ||
    firstNameFromEmail(
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_USER_EMAIL
        : undefined,
    );

  useEffect(() => {
    if (!open) {
      setError(null);
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

  const submit = async (overridePrompt?: string) => {
    const trimmed = (overridePrompt ?? prompt).trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);

    try {
      const { pan, zoom } = useViewport.getState();
      const existing = useBoard.getState().items;

      // Anchor the generated block near the top-left of the current viewport.
      const anchor = {
        x: (40 - pan.x) / zoom,
        y: (120 - pan.y) / zoom,
      };

      // When the user has items selected, include their contents as context
      // so the model can build on / critique / extend what's already there.
      const selectedItems = existing.filter((it) =>
        selectedIds.includes(it.id),
      );
      const contextSuffix =
        selectedItems.length > 0
          ? `\n\nCurrent selection (use this as context):\n${JSON.stringify(
              selectedItems,
              null,
              2,
            )}`
          : "";

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed + contextSuffix,
          anchor,
          existingCount: existing.length,
        }),
      });

      const data = (await res.json()) as { items?: unknown[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("The model didn't return any items.");
      }

      const items = remapItems(data.items);
      if (items.length === 0) {
        throw new Error("None of the returned items were valid.");
      }

      const { addItem, setSelection } = useBoard.getState();
      for (const item of items) addItem(item);
      setSelection(items.map((it) => it.id));
      setPrompt("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
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
          <div className="flex-1 overflow-y-auto px-4 pb-3 pt-8">
            <div
              className="mb-3 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-[var(--shadow-sm)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent) 0%, #c97a1f 100%)",
              }}
            >
              <Sparkles size={16} strokeWidth={1.8} />
            </div>

            <h2 className="font-serif text-[32px] italic leading-[1.05] text-ink">
              Hello {greetName}
            </h2>
            <p className="mt-3 text-[13px] leading-[1.55] text-ink-soft">
              I'm here to collaborate and help you think through problems,
              create content, and get things done using your canvas as the
              prompt.
            </p>

            <p className="mt-5 font-serif text-[15px] italic text-ink">
              I can help:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setPrompt(s);
                    void submit(s);
                  }}
                  className="rounded-full border border-[var(--line)] bg-panel px-3 py-1.5 text-[12.5px] text-ink hover:bg-panel-soft disabled:opacity-60"
                >
                  {s}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-5 rounded-[var(--r-md)] border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-2 text-[12px] text-[var(--accent)]">
                {error}
              </div>
            )}

            {loading && (
              <div className="mt-5 flex items-center gap-2 text-[12.5px] text-muted">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
                Generating…
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
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void submit();
                }}
                placeholder="What are you working on?"
                rows={1}
                disabled={loading}
                className="no-focus-ring block w-full resize-none bg-transparent px-3 py-2.5 text-[13px] text-ink placeholder:text-muted disabled:opacity-60"
                style={{ outline: "none", minHeight: 40, maxHeight: 160 }}
              />

              <div className="flex items-center gap-0.5 border-t border-[var(--line)] px-1.5 py-1.5">
                <ToolbarIconButton label="Search the web">
                  <Globe size={13} strokeWidth={1.8} />
                  <ChevronDown
                    size={10}
                    strokeWidth={1.8}
                    className="text-muted"
                  />
                </ToolbarIconButton>
                <ToolbarIconButton label="Diagram">
                  <Workflow size={13} strokeWidth={1.8} />
                </ToolbarIconButton>
                <ToolbarIconButton label="Document">
                  <TypeIcon size={13} strokeWidth={1.8} />
                </ToolbarIconButton>
                <ToolbarIconButton label="Image">
                  <ImageIcon size={13} strokeWidth={1.8} />
                </ToolbarIconButton>
                <ToolbarIconButton label="Frame">
                  <span className="inline-block h-3 w-3 rounded-[2px] border border-current" />
                </ToolbarIconButton>
                <ToolbarIconButton label="Mobile frame">
                  <span className="inline-block h-3 w-2 rounded-[2px] border border-current" />
                </ToolbarIconButton>
                <ToolbarIconButton label="Connector">
                  <span className="inline-block h-[1px] w-3 bg-current" />
                </ToolbarIconButton>
                <ToolbarIconButton label="Sticky">
                  <span className="inline-block h-3 w-3 rounded-[2px] border border-current" />
                </ToolbarIconButton>
                <ToolbarIconButton label="Table">
                  <TableIcon size={13} strokeWidth={1.8} />
                </ToolbarIconButton>
                <ToolbarIconButton label="Flow">
                  <Workflow size={13} strokeWidth={1.8} />
                </ToolbarIconButton>
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex items-center gap-0.5 rounded-[var(--r-md)] p-1.5 text-ink-soft hover:bg-panel-soft"
    >
      {children}
    </button>
  );
}
