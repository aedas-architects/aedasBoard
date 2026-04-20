"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useBoard } from "../lib/board-store";

export function AlignBar() {
  const selectedIds = useBoard((s) => s.selectedIds);
  const alignSelected = useBoard((s) => s.alignSelected);
  const distributeSelected = useBoard((s) => s.distributeSelected);

  const count = selectedIds.length;
  const visible = count >= 2;
  const canDistribute = count >= 3;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="align-bar"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute left-1/2 top-[128px] z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel px-1.5 py-1 shadow-[var(--shadow-md)]"
        >
          <Btn onClick={() => alignSelected("left")} title="Align left">
            <AlignStartVertical size={14} strokeWidth={1.8} />
          </Btn>
          <Btn onClick={() => alignSelected("center-h")} title="Align center">
            <AlignCenterVertical size={14} strokeWidth={1.8} />
          </Btn>
          <Btn onClick={() => alignSelected("right")} title="Align right">
            <AlignEndVertical size={14} strokeWidth={1.8} />
          </Btn>
          <span className="mx-1 h-4 w-px bg-[var(--line)]" />
          <Btn onClick={() => alignSelected("top")} title="Align top">
            <AlignStartHorizontal size={14} strokeWidth={1.8} />
          </Btn>
          <Btn onClick={() => alignSelected("middle-v")} title="Align middle">
            <AlignCenterHorizontal size={14} strokeWidth={1.8} />
          </Btn>
          <Btn onClick={() => alignSelected("bottom")} title="Align bottom">
            <AlignEndHorizontal size={14} strokeWidth={1.8} />
          </Btn>
          <span className="mx-1 h-4 w-px bg-[var(--line)]" />
          <Btn
            onClick={() => distributeSelected("h")}
            title="Distribute horizontally"
            disabled={!canDistribute}
          >
            <AlignHorizontalDistributeCenter size={14} strokeWidth={1.8} />
          </Btn>
          <Btn
            onClick={() => distributeSelected("v")}
            title="Distribute vertically"
            disabled={!canDistribute}
          >
            <AlignVerticalDistributeCenter size={14} strokeWidth={1.8} />
          </Btn>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Btn({
  children,
  onClick,
  title,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] ${
        disabled
          ? "text-muted opacity-40 cursor-not-allowed"
          : "text-ink-soft hover:bg-panel-soft"
      }`}
    >
      {children}
    </motion.button>
  );
}
