"use client";

import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { newId, useBoard } from "../lib/board-store";
import { EMOJI_CATEGORIES, STICKER_PICKS } from "../lib/emoji-data";
import * as giphy from "../lib/giphy";
import { useTool } from "../lib/tool-store";
import { useViewport } from "../lib/viewport-store";

type Tab = "all" | "stickers" | "emojis" | "gifs";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "stickers", label: "Stickers" },
  { id: "emojis", label: "Emojis" },
  { id: "gifs", label: "GIFs" },
];

export function StickersPanel() {
  const activeTool = useTool((s) => s.active);
  const setActive = useTool((s) => s.setActive);
  const pan = useViewport((s) => s.pan);
  const zoom = useViewport((s) => s.zoom);
  const addItem = useBoard((s) => s.addItem);

  const [tab, setTab] = useState<Tab>("stickers");
  const [query, setQuery] = useState("");
  const [emojisReady, setEmojisReady] = useState(false);

  const visible = activeTool === "stickers";

  // Defer the heavy emoji grid one frame after the panel opens so the panel's
  // paint lands immediately. Once mounted it stays mounted.
  useEffect(() => {
    if (!visible || emojisReady) return;
    const id = window.setTimeout(() => setEmojisReady(true), 40);
    return () => window.clearTimeout(id);
  }, [visible, emojisReady]);

  const viewportCenter = () => ({
    x: (window.innerWidth / 2 - pan.x) / zoom,
    y: (window.innerHeight / 2 - pan.y) / zoom,
  });

  const insertEmoji = (glyph: string, size = 72) => {
    const { x, y } = viewportCenter();
    addItem({
      id: newId("text"),
      type: "text",
      x: x - size / 2,
      y: y - size / 2,
      w: size + 24,
      h: size + 8,
      rotation: 0,
      text: glyph,
      fontSize: size,
      fontFamily: "sans",
      fontWeight: 400,
      align: "center",
      autoSize: true,
      color: "var(--ink)",
    });
  };

  const insertImage = (src: string, naturalW: number, naturalH: number, alt: string) => {
    const { x, y } = viewportCenter();
    const maxW = 320;
    const ratio = naturalH / naturalW || 1;
    const w = Math.min(maxW, naturalW || maxW);
    const h = w * ratio;
    addItem({
      id: newId("image"),
      type: "image",
      x: x - w / 2,
      y: y - h / 2,
      w,
      h,
      rotation: 0,
      src,
      naturalW,
      naturalH,
      alt,
    });
  };

  const filteredEmojis = useMemo(() => {
    if (!query.trim()) return EMOJI_CATEGORIES;
    const q = query.trim().toLowerCase();
    return EMOJI_CATEGORIES.map((c) => ({
      ...c,
      items: c.items.filter(
        (e) => c.label.toLowerCase().includes(q) || c.id.includes(q) || e.includes(q),
      ),
    })).filter((c) => c.items.length > 0);
  }, [query]);

  const filteredStickers = useMemo(() => {
    if (!query.trim()) return STICKER_PICKS;
    return STICKER_PICKS;
  }, [query]);

  const showStickers = tab === "all" || tab === "stickers";
  const showEmojis = tab === "all" || tab === "emojis";
  const showGifs = tab === "all" || tab === "gifs";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="stickers-panel"
          initial={{ opacity: 0, x: -12, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -12, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute left-[72px] top-1/2 z-30 flex -translate-y-1/2 flex-col rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-md)]"
          style={{ width: 340, maxHeight: "min(640px, 80vh)" }}
        >
          <header className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2.5">
            <div className="flex flex-1 items-center gap-2 rounded-[var(--r-md)] border border-[var(--line)] bg-panel-soft px-2.5 py-1.5">
              <Search size={13} strokeWidth={1.8} className="text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setActive("select")}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] text-muted hover:bg-panel-soft hover:text-ink"
              aria-label="Close stickers"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </header>

          <nav className="flex items-center gap-1 border-b border-[var(--line)] px-2 py-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-[var(--r-md)] px-2 py-1 text-[12.5px] font-medium transition-colors ${
                  tab === t.id
                    ? "bg-ink text-white"
                    : "text-ink-soft hover:bg-panel-soft"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto">
            {showStickers && (
              <Section title="Stickers">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: 4,
                  }}
                >
                  {filteredStickers.map((glyph, i) => (
                    <EmojiButton
                      key={`sticker-${i}-${glyph}`}
                      glyph={glyph}
                      size={32}
                      onClick={() => insertEmoji(glyph, 96)}
                    />
                  ))}
                </div>
              </Section>
            )}

            {showEmojis &&
              (emojisReady ? (
                filteredEmojis.map((c) => (
                  <Section key={c.id} title={c.label}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(8, 1fr)",
                        gap: 2,
                      }}
                    >
                      {c.items.map((glyph, i) => (
                        <EmojiButton
                          key={`${c.id}-${i}-${glyph}`}
                          glyph={glyph}
                          size={22}
                          onClick={() => insertEmoji(glyph, 60)}
                        />
                      ))}
                    </div>
                  </Section>
                ))
              ) : (
                <Section title="Emojis">
                  <div className="flex items-center gap-2 px-1 py-2 text-[11px] text-muted">
                    Loading…
                  </div>
                </Section>
              ))}

            {showGifs && (
              <GifsGrid
                query={query}
                onPick={(g) => insertImage(g.fullUrl, g.fullW, g.fullH, g.title)}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-3 py-2">
      <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function EmojiButton({
  glyph,
  size,
  onClick,
}: {
  glyph: string;
  size: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.18 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      onClick={onClick}
      className="flex aspect-square items-center justify-center rounded-[var(--r-sm)] hover:bg-panel-soft"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {glyph}
    </motion.button>
  );
}

function GifsGrid({
  query,
  onPick,
}: {
  query: string;
  onPick: (g: giphy.GiphyItem) => void;
}) {
  const [items, setItems] = useState<giphy.GiphyItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">(
    "idle",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!giphy.isConfigured()) {
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const q = query.trim();

    const run = async () => {
      try {
        setStatus("loading");
        const data = q
          ? await giphy.search(q, 24, controller.signal)
          : await giphy.trending(24, controller.signal);
        setItems(data);
        setStatus("ready");
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setErrMsg((err as Error).message || "Something went wrong.");
        setStatus("error");
      }
    };

    // Debounce search, fire trending immediately.
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const delay = q ? 280 : 0;
    debounceRef.current = window.setTimeout(run, delay);

    return () => {
      controller.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (!giphy.isConfigured()) {
    return (
      <section className="px-4 py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-panel-soft text-[24px]">
          ✨
        </div>
        <h3 className="font-serif text-[22px] italic text-ink">
          GIFs, once you connect.
        </h3>
        <p className="mx-auto mt-2 max-w-[240px] text-[12.5px] leading-[1.4] text-ink-soft">
          Set <code className="font-mono text-[11px]">NEXT_PUBLIC_GIPHY_API_KEY</code>{" "}
          in <code className="font-mono text-[11px]">.env</code> to enable.
        </p>
      </section>
    );
  }

  if (status === "loading" && items.length === 0) {
    return (
      <Section title={query.trim() ? `Results for “${query.trim()}”` : "Trending"}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 6,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--r-md)] bg-panel-soft"
              style={{ paddingTop: "100%" }}
            />
          ))}
        </div>
      </Section>
    );
  }

  if (status === "error") {
    return (
      <section className="px-4 py-8 text-center">
        <p className="font-serif text-[18px] italic text-muted">
          Couldn&apos;t reach Giphy.
        </p>
        <p className="mx-auto mt-1 max-w-[240px] text-[12px] text-ink-soft">
          {errMsg ?? "Check your API key and try again."}
        </p>
      </section>
    );
  }

  if (status === "ready" && items.length === 0) {
    return (
      <section className="px-4 py-8 text-center">
        <p className="font-serif text-[18px] italic text-muted">
          Nothing for “{query.trim()}”.
        </p>
      </section>
    );
  }

  return (
    <Section title={query.trim() ? `Results for “${query.trim()}”` : "Trending"}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 6,
        }}
      >
        {items.map((g) => (
          <GifCard key={g.id} gif={g} onPick={onPick} />
        ))}
      </div>
    </Section>
  );
}

function GifCard({
  gif,
  onPick,
}: {
  gif: giphy.GiphyItem;
  onPick: (g: giphy.GiphyItem) => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      onClick={() => onPick(gif)}
      className="relative overflow-hidden rounded-[var(--r-md)] bg-panel-soft"
      style={{
        aspectRatio:
          gif.previewW && gif.previewH ? `${gif.previewW} / ${gif.previewH}` : "1 / 1",
      }}
      title={gif.title}
    >
      <img
        src={gif.previewUrl}
        alt={gif.title}
        loading="lazy"
        draggable={false}
        className="h-full w-full object-cover"
        style={{ userSelect: "none" }}
      />
    </motion.button>
  );
}
