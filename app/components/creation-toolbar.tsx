"use client";

import {
  Eraser,
  Frame,
  Highlighter,
  LayoutTemplate,
  MessageCircle,
  MousePointer2,
  Pencil,
  Plus,
  Shapes,
  Smile,
  StickyNote,
  Type,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Tool, useTool } from "../lib/tool-store";
import { useUI } from "../lib/ui-store";

type ToolDef = {
  id: Tool;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
};

function ConnectorIcon({ size = 17, strokeWidth = 1.8 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 17 17"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8.5 H11" />
      <path d="M11 5 L14 8.5 L11 12" />
    </svg>
  );
}

const navTools: ToolDef[] = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
];

// Primary creation tools — ordered to match Miro's vertical toolbar.
const contentTools: ToolDef[] = [
  { id: "templates", label: "Templates", shortcut: "", icon: LayoutTemplate },
  { id: "sticky", label: "Sticky note", shortcut: "N", icon: StickyNote },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "shape", label: "Shape", shortcut: "S", icon: Shapes },
  { id: "pen", label: "Pen", shortcut: "P", icon: Pencil },
  { id: "frame", label: "Frame", shortcut: "F", icon: Frame },
  { id: "stickers", label: "Stickers & Emoji", shortcut: "", icon: Smile },
  { id: "comment", label: "Comment", shortcut: "C", icon: MessageCircle },
];

// Secondary tools that live below the divider.
const structureTools: ToolDef[] = [
  { id: "connector", label: "Connector", shortcut: "L", icon: ConnectorIcon },
  { id: "highlighter", label: "Highlighter", shortcut: "", icon: Highlighter },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: Eraser },
  { id: "more", label: "More", shortcut: "", icon: Plus },
];

const toolIndex = [...navTools, ...contentTools, ...structureTools];

function ToolButton({
  tool,
  active,
  onClick,
  stagger,
}: {
  tool: ToolDef;
  active: boolean;
  onClick: () => void;
  stagger: number;
}) {
  const Icon = tool.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1], delay: stagger }}
      whileTap={{ scale: 0.9 }}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-[var(--r-xl)] transition-colors ${
        active ? "bg-ink text-white" : "text-ink-soft hover:bg-panel-soft"
      }`}
      aria-label={tool.label}
      aria-pressed={active}
    >
      <Icon size={17} strokeWidth={1.8} />

      <AnimatePresence>
        {hovered && (
          <motion.span
            key="tip"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 flex items-center gap-2 whitespace-nowrap rounded-[var(--r-md)] bg-ink px-2 py-1 text-[11.5px] font-medium text-[var(--panel-soft)] shadow-[var(--shadow-md)]"
          >
            {tool.label}
            {tool.shortcut && (
              <kbd className="font-mono text-[10px] opacity-60">{tool.shortcut}</kbd>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function CreationToolbar() {
  const active = useTool((s) => s.active);
  const setActive = useTool((s) => s.setActive);
  const setTemplatesOpen = useUI((s) => s.setTemplates);

  const staggerFor = (id: Tool) => {
    const idx = toolIndex.findIndex((t) => t.id === id);
    return 0.04 + idx * 0.025;
  };

  // Templates isn't a persistent mode — clicking it opens a modal, no active state.
  const handleToolClick = (id: Tool) => {
    if (id === "templates") {
      setTemplatesOpen(true);
      return;
    }
    setActive(id);
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="pointer-events-auto absolute left-[14px] top-1/2 z-30 -translate-y-1/2 flex flex-col items-center gap-0.5 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-1.5 shadow-[var(--shadow-md)]"
    >
      {navTools.map((t) => (
        <ToolButton
          key={t.id}
          tool={t}
          active={active === t.id}
          onClick={() => handleToolClick(t.id)}
          stagger={staggerFor(t.id)}
        />
      ))}
      <span className="my-1 h-px w-7 bg-[var(--line)]" />
      {contentTools.map((t) => (
        <ToolButton
          key={t.id}
          tool={t}
          active={active === t.id}
          onClick={() => handleToolClick(t.id)}
          stagger={staggerFor(t.id)}
        />
      ))}
      <span className="my-1 h-px w-7 bg-[var(--line)]" />
      {structureTools.map((t) => (
        <ToolButton
          key={t.id}
          tool={t}
          active={active === t.id}
          onClick={() => handleToolClick(t.id)}
          stagger={staggerFor(t.id)}
        />
      ))}
    </motion.aside>
  );
}
