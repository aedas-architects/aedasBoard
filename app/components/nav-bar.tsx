"use client";

import { HelpCircle, LayoutDashboard, Map, Maximize2, Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useBoard } from "../lib/board-store";
import { useUI } from "../lib/ui-store";
import { useViewport } from "../lib/viewport-store";

function NavButton({
  children,
  onClick,
  title,
  ariaLabel,
  wide = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  ariaLabel?: string;
  wide?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className={`flex h-[34px] items-center justify-center rounded-[var(--r-lg)] text-ink-soft hover:bg-panel-soft ${
        wide ? "min-w-[56px] font-mono text-[11px] uppercase tracking-[0.06em] text-ink" : "w-[34px]"
      }`}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </motion.button>
  );
}

export function NavBar() {
  const zoom = useViewport((s) => s.zoom);
  const zoomStep = useViewport((s) => s.zoomStep);
  const zoomTo100 = useViewport((s) => s.zoomTo100);
  const fitToBBox = useViewport((s) => s.fitToBBox);
  const minimapVisible = useViewport((s) => s.minimapVisible);
  const toggleMinimap = useViewport((s) => s.toggleMinimap);
  const contentBBox = useBoard((s) => s.contentBBox);
  const setShortcuts = useUI((s) => s.setShortcuts);
  const framesPanelOpen = useUI((s) => s.framesPanelOpen);
  const setFramesPanel = useUI((s) => s.setFramesPanel);

  const zoomPct = Math.round(zoom * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
      className="pointer-events-auto absolute bottom-[14px] right-[14px] z-30 flex items-center gap-0.5 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-md)]"
    >
      <NavButton onClick={() => zoomStep(-1)} ariaLabel="Zoom out">
        <Minus size={15} strokeWidth={1.8} />
      </NavButton>
      <NavButton wide onClick={zoomTo100} title="Reset to 100%">
        {zoomPct}%
      </NavButton>
      <NavButton onClick={() => zoomStep(1)} ariaLabel="Zoom in">
        <Plus size={15} strokeWidth={1.8} />
      </NavButton>

      <span className="mx-1 h-5 w-px bg-[var(--line)]" />

      <NavButton
        onClick={() => {
          const bbox = contentBBox();
          if (bbox) fitToBBox(bbox);
        }}
        title="Fit to screen (3)"
        ariaLabel="Fit to screen"
      >
        <Maximize2 size={14} strokeWidth={1.8} />
      </NavButton>
      <motion.button
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        onClick={() => setFramesPanel(!framesPanelOpen)}
        title="Frames panel"
        aria-label="Toggle frames panel"
        aria-pressed={framesPanelOpen}
        className={`flex h-[34px] w-[34px] items-center justify-center rounded-[var(--r-lg)] ${
          framesPanelOpen
            ? "bg-ink text-white"
            : "text-ink-soft hover:bg-panel-soft"
        }`}
      >
        <LayoutDashboard size={15} strokeWidth={1.8} />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        onClick={toggleMinimap}
        title="Minimap"
        aria-label="Toggle minimap"
        aria-pressed={minimapVisible}
        className={`flex h-[34px] w-[34px] items-center justify-center rounded-[var(--r-lg)] ${
          minimapVisible
            ? "bg-ink text-white"
            : "text-ink-soft hover:bg-panel-soft"
        }`}
      >
        <Map size={15} strokeWidth={1.8} />
      </motion.button>
      <NavButton
        title="Shortcuts (?)"
        ariaLabel="Shortcuts"
        onClick={() => setShortcuts(true)}
      >
        <HelpCircle size={15} strokeWidth={1.8} />
      </NavButton>
    </motion.div>
  );
}
