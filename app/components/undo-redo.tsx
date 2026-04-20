"use client";

import { Redo2, Undo2 } from "lucide-react";
import { motion } from "motion/react";
import { useBoard } from "../lib/board-store";

export function UndoRedo() {
  const undo = useBoard((s) => s.undo);
  const redo = useBoard((s) => s.redo);
  const historyLen = useBoard((s) => s.history.length);
  const futureLen = useBoard((s) => s.future.length);

  const canUndo = historyLen > 0;
  const canRedo = futureLen > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
      className="pointer-events-auto absolute bottom-[14px] left-[14px] z-30 flex items-center gap-0.5 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-md)]"
    >
      <motion.button
        whileTap={canUndo ? { scale: 0.92 } : undefined}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        onClick={undo}
        disabled={!canUndo}
        className={`flex h-[34px] w-[34px] items-center justify-center rounded-[var(--r-lg)] ${
          canUndo
            ? "text-ink-soft hover:bg-panel-soft"
            : "text-muted opacity-40 cursor-not-allowed"
        }`}
        title="Undo (⌘Z)"
        aria-label="Undo"
      >
        <Undo2 size={15} strokeWidth={1.8} />
      </motion.button>
      <motion.button
        whileTap={canRedo ? { scale: 0.92 } : undefined}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        onClick={redo}
        disabled={!canRedo}
        className={`flex h-[34px] w-[34px] items-center justify-center rounded-[var(--r-lg)] ${
          canRedo
            ? "text-ink-soft hover:bg-panel-soft"
            : "text-muted opacity-40 cursor-not-allowed"
        }`}
        title="Redo (⌘⇧Z)"
        aria-label="Redo"
      >
        <Redo2 size={15} strokeWidth={1.8} />
      </motion.button>
    </motion.div>
  );
}
