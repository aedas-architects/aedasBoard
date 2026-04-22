"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePresence } from "../lib/presence-store";
import { useViewport } from "../lib/viewport-store";

/**
 * Screen-space overlay that renders a colored cursor + name tag for every
 * remote peer. Reads world-space cursor positions from the presence store
 * and transforms to screen-space using the current pan/zoom.
 */
export function PeerCursors() {
  const peersRecord = usePresence((s) => s.peers);
  const pan = useViewport((s) => s.pan);
  const zoom = useViewport((s) => s.zoom);

  const peers = Object.values(peersRecord).filter((p) => p.cursor);

  return (
    <AnimatePresence>
      {peers.map((p) => {
        const screenX = p.cursor!.x * zoom + pan.x;
        const screenY = p.cursor!.y * zoom + pan.y;
        return (
          <motion.div
            key={p.userId}
            className="pointer-events-none absolute z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, left: screenX, top: screenY }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.15 },
              left: { type: "spring", stiffness: 500, damping: 40, mass: 0.4 },
              top: { type: "spring", stiffness: 500, damping: 40, mass: 0.4 },
            }}
          >
            {/* Cursor arrow (SVG) */}
            <svg
              width="20"
              height="22"
              viewBox="0 0 20 22"
              fill="none"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" }}
            >
              <path
                d="M1 1L1 16L5.5 12L8.5 19L11 18L8 11L14 11L1 1Z"
                fill={p.color}
                stroke="#fff"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
            </svg>

            {/* Name tag */}
            <div
              className="absolute left-4 top-4 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white shadow-[var(--shadow-sm)]"
              style={{ background: p.color }}
            >
              {p.userName}
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
