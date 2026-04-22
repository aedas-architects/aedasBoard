"use client";

import {
  CreditCard,
  Download,
  Eraser,
  FileText,
  FileUp,
  Frame,
  GitBranch,
  Hand,
  Highlighter,
  ImagePlus,
  KanbanSquare,
  LayoutTemplate,
  MessageCircle,
  MonitorPlay,
  MousePointer2,
  Pencil,
  Plus,
  Presentation,
  Search,
  Shapes,
  Smartphone,
  Smile,
  Sparkles,
  StickyNote,
  Table,
  Target,
  Timer,
  Type,
  Workflow,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiGenerateDialog } from "./ai-generate-dialog";
import {
  downloadBoardFile,
  FILE_EXTENSION,
  readBoardFileFromBlob,
  serializeBoard,
} from "../lib/board-file";
import { useBoard } from "../lib/board-store";
import { useBoards } from "../lib/boards-store";
import { ingestFiles } from "../lib/image-ingest";
import { Tool, useTool } from "../lib/tool-store";
import { useUI } from "../lib/ui-store";
import { useViewport } from "../lib/viewport-store";

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

// The nav slot toggles between Select and Hand — same button, click the
// active one to switch modes. The icon/label update to reflect current tool.
const selectToolDef: ToolDef = { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 };
const handToolDef: ToolDef = { id: "hand", label: "Hand (pan)", shortcut: "H", icon: Hand };

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

const toolIndex = [selectToolDef, handToolDef, ...contentTools, ...structureTools];

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

type MoreEntry = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconTint: string;
  addOn?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

type MoreSection = {
  title: string;
  entries: MoreEntry[];
};

function MoreRow({ entry }: { entry: MoreEntry }) {
  return (
    <button
      type="button"
      onClick={entry.disabled ? undefined : entry.onClick}
      disabled={entry.disabled}
      className={`group flex w-full items-start gap-3 rounded-[var(--r-md)] px-2 py-2 text-left transition-colors ${
        entry.disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:bg-panel-soft"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg)] text-ink-soft">
        {entry.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-ink">{entry.title}</span>
          {entry.addOn && (
            <span className="rounded-[var(--r-sm)] bg-[var(--accent-soft)] px-1.5 py-[1px] text-[10px] font-medium text-[var(--accent)]">
              Add-on
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] leading-snug text-muted">
          {entry.description}
        </span>
      </span>
    </button>
  );
}

function MorePopover({
  open,
  onClose,
  onUploadFiles,
  onOpenAiGenerate,
}: {
  open: boolean;
  onClose: () => void;
  onUploadFiles: (files: FileList) => void;
  onOpenAiGenerate: () => void;
}) {
  const setTemplates = useUI((s) => s.setTemplates);
  const setShapesLibrary = useUI((s) => s.setShapesLibrary);
  const setFramesPanel = useUI((s) => s.setFramesPanel);
  const startPresenting = useUI((s) => s.startPresenting);
  const setActive = useTool((s) => s.setActive);
  const fileRef = useRef<HTMLInputElement>(null);
  const boardFileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"tools" | "marketplace">("tools");

  const exportBoardFile = () => {
    const { items } = useBoard.getState();
    const { pan, zoom } = useViewport.getState();
    // Infer current board id/title from the URL + boards store when available.
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const match = /\/board\/([^/?#]+)/.exec(path);
    const boardId = match?.[1] ?? "unsaved";
    const boards = useBoards.getState().boards;
    const meta = boards.find((b) => b.id === boardId);
    const file = serializeBoard({
      meta: {
        id: boardId,
        title: meta?.name ?? "Untitled board",
        createdAt: meta?.createdAt,
        updatedAt: Date.now(),
      },
      items,
      viewport: { pan, zoom },
    });
    downloadBoardFile(file);
    onClose();
  };

  const importBoardFile = async (file: File) => {
    const result = await readBoardFileFromBlob(file);
    if (!result.ok) {
      alert(`Couldn't open board file:\n${result.error}`);
      return;
    }
    useBoard.setState({
      items: result.file.items,
      selectedIds: [],
      editingId: null,
    });
    if (result.file.viewport) {
      useViewport.setState({
        pan: result.file.viewport.pan,
        zoom: result.file.viewport.zoom,
      });
    }
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setQuery("");
      setTab("tools");
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const activate = (t: Tool) => {
    setActive(t);
    onClose();
  };

  const sections: MoreSection[] = useMemo(() => {
    const comingSoon = () =>
      alert("This format isn't available yet in this build.");
    return [
      {
        title: "Formats",
        entries: [
          {
            id: "prototype",
            title: "Prototype",
            description: "Visualize concepts and build interactive flows",
            icon: <Smartphone size={17} strokeWidth={1.6} />,
            iconTint: "#6e57d9",
            addOn: true,
            disabled: true,
            onClick: () => {},
          },
          {
            id: "diagram",
            title: "Diagram",
            description: "Visualize processes & systems with a diagram",
            icon: <Workflow size={17} strokeWidth={1.6} />,
            iconTint: "#d97a1f",
            onClick: () => {
              setShapesLibrary(true);
              onClose();
            },
          },
          {
            id: "table",
            title: "Table",
            description: "Structure your data using a table",
            icon: <Table size={17} strokeWidth={1.6} />,
            iconTint: "#2f9a6c",
            onClick: comingSoon,
          },
          {
            id: "timeline",
            title: "Timeline",
            description: "Plan your work using a timeline",
            icon: <Timer size={17} strokeWidth={1.6} />,
            iconTint: "#2f9a6c",
            onClick: comingSoon,
          },
          {
            id: "kanban",
            title: "Kanban",
            description: "Visualize your workflows with multi-view options",
            icon: <KanbanSquare size={17} strokeWidth={1.6} />,
            iconTint: "#2f9a6c",
            onClick: comingSoon,
          },
          {
            id: "doc",
            title: "Doc",
            description: "Create a document on the canvas",
            icon: <FileText size={17} strokeWidth={1.6} />,
            iconTint: "#2e6fdb",
            onClick: () => activate("text"),
          },
          {
            id: "slides",
            title: "Slides",
            description: "Showcase your work with slides",
            icon: <MonitorPlay size={17} strokeWidth={1.6} />,
            iconTint: "#d94a38",
            onClick: () => {
              startPresenting(0);
              onClose();
            },
          },
          {
            id: "engage",
            title: "Engage Activities",
            description: "Engage your audience with activities",
            icon: <Target size={17} strokeWidth={1.6} />,
            iconTint: "#d94a38",
            onClick: comingSoon,
          },
        ],
      },
      {
        title: "Essentials",
        entries: [
          {
            id: "pen",
            title: "Pen",
            description: "Create freehand drawings",
            icon: <Pencil size={17} strokeWidth={1.6} />,
            iconTint: "#1a1a1a",
            onClick: () => activate("pen"),
          },
          {
            id: "sticky",
            title: "Sticky note",
            description: "Capture quick thoughts on a sticky",
            icon: <StickyNote size={17} strokeWidth={1.6} />,
            iconTint: "#c9a11a",
            onClick: () => activate("sticky"),
          },
          {
            id: "card",
            title: "Card",
            description: "Organize and assign work",
            icon: <CreditCard size={17} strokeWidth={1.6} />,
            iconTint: "#1a1a1a",
            onClick: () => activate("sticky"),
          },
          {
            id: "text",
            title: "Text",
            description: "Add editable text anywhere",
            icon: <Type size={17} strokeWidth={1.6} />,
            iconTint: "#1a1a1a",
            onClick: () => activate("text"),
          },
          {
            id: "shape",
            title: "Shape",
            description: "Rectangles, ellipses, arrows and more",
            icon: <Shapes size={17} strokeWidth={1.6} />,
            iconTint: "#2e6fdb",
            onClick: () => activate("shape"),
          },
          {
            id: "frame",
            title: "Frame",
            description: "Group and present sections of the board",
            icon: <Frame size={17} strokeWidth={1.6} />,
            iconTint: "#1a1a1a",
            onClick: () => activate("frame"),
          },
          {
            id: "connector",
            title: "Connector",
            description: "Draw arrows between items",
            icon: <GitBranch size={17} strokeWidth={1.6} />,
            iconTint: "#1a1a1a",
            onClick: () => activate("connector"),
          },
          {
            id: "comment",
            title: "Comment",
            description: "Leave feedback on the board",
            icon: <MessageCircle size={17} strokeWidth={1.6} />,
            iconTint: "#d94a38",
            onClick: () => activate("comment"),
          },
          {
            id: "image",
            title: "Image",
            description: "Upload an image from your device",
            icon: <ImagePlus size={17} strokeWidth={1.6} />,
            iconTint: "#2f9a6c",
            onClick: () => fileRef.current?.click(),
          },
          {
            id: "stickers",
            title: "Stickers & Emoji",
            description: "Browse fun stickers and emoji",
            icon: <Smile size={17} strokeWidth={1.6} />,
            iconTint: "#c9a11a",
            onClick: () => activate("stickers"),
          },
          {
            id: "templates",
            title: "Templates",
            description: "Start from a pre-built layout",
            icon: <LayoutTemplate size={17} strokeWidth={1.6} />,
            iconTint: "#1a1a1a",
            onClick: () => {
              setTemplates(true);
              onClose();
            },
          },
          {
            id: "frames-panel",
            title: "Frames panel",
            description: "Navigate frames on this board",
            icon: <Presentation size={17} strokeWidth={1.6} />,
            iconTint: "#1a1a1a",
            onClick: () => {
              setFramesPanel(true);
              onClose();
            },
          },
          {
            id: "export-board",
            title: `Download board (${FILE_EXTENSION})`,
            description:
              "Save a portable Aedas board file for backup or sharing",
            icon: <Download size={17} strokeWidth={1.6} />,
            iconTint: "#1a1a1a",
            onClick: exportBoardFile,
          },
          {
            id: "import-board",
            title: "Open board file…",
            description: `Load a ${FILE_EXTENSION} document into this board`,
            icon: <FileUp size={17} strokeWidth={1.6} />,
            iconTint: "#1a1a1a",
            onClick: () => boardFileRef.current?.click(),
          },
          {
            id: "ai-generate",
            title: "Generate with AI",
            description: "Describe a board and let AI build it for you",
            icon: <Sparkles size={17} strokeWidth={1.6} />,
            iconTint: "#1a1a1a",
            onClick: () => {
              onOpenAiGenerate();
              onClose();
            },
          },
        ],
      },
    ];
  }, [
    onClose,
    setActive,
    setFramesPanel,
    setShapesLibrary,
    setTemplates,
    startPresenting,
    exportBoardFile,
  ]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((sec) => ({
        ...sec,
        entries: sec.entries.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q),
        ),
      }))
      .filter((sec) => sec.entries.length > 0);
  }, [query, sections]);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) onUploadFiles(files);
          if (fileRef.current) fileRef.current.value = "";
          onClose();
        }}
      />
      <input
        ref={boardFileRef}
        type="file"
        accept={`${FILE_EXTENSION},application/json`}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importBoardFile(f);
          if (boardFileRef.current) boardFileRef.current.value = "";
        }}
      />
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[60]" onPointerDown={onClose} />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, x: -4 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.98, x: -4 }}
              transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute left-[calc(100%+10px)] bottom-0 z-[70] flex h-[560px] w-[360px] flex-col rounded-[var(--r-xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-md)]"
            >
              <div className="px-3 pb-2 pt-3">
                <div className="flex items-center gap-2 rounded-[var(--r-lg)] border border-[var(--line)] bg-panel px-2.5 py-2">
                  <Search size={15} strokeWidth={1.8} className="text-muted" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tools..."
                    className="no-focus-ring flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted"
                    style={{ outline: "none", boxShadow: "none" }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1 border-b border-[var(--line)] px-3 pb-2">
                {(["tools", "marketplace"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-[var(--r-md)] px-2.5 py-1 text-[13px] capitalize transition-colors ${
                      tab === t
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-ink-soft hover:bg-panel-soft"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-2">
                {tab === "marketplace" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                    <Sparkles
                      size={22}
                      strokeWidth={1.6}
                      className="text-muted"
                    />
                    <p className="text-[13px] font-medium text-ink">
                      Marketplace coming soon
                    </p>
                    <p className="text-[11.5px] text-muted">
                      Third-party integrations and apps will appear here.
                    </p>
                  </div>
                ) : filteredSections.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[12px] text-muted">
                    No tools match "{query}".
                  </p>
                ) : (
                  filteredSections.map((sec) => (
                    <div key={sec.title} className="mb-3">
                      <p className="px-2 pb-1 pt-2 text-[13px] font-semibold text-ink">
                        {sec.title}
                      </p>
                      <div className="flex flex-col">
                        {sec.entries.map((entry) => (
                          <MoreRow key={entry.id} entry={entry} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function CreationToolbar() {
  const active = useTool((s) => s.active);
  const setActive = useTool((s) => s.setActive);
  const setTemplatesOpen = useUI((s) => s.setTemplates);
  const [moreOpen, setMoreOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const staggerFor = (id: Tool) => {
    const idx = toolIndex.findIndex((t) => t.id === id);
    return 0.04 + idx * 0.025;
  };

  // Templates/More aren't persistent modes — they open overlays, no active state.
  const handleToolClick = (id: Tool) => {
    if (id === "templates") {
      setTemplatesOpen(true);
      return;
    }
    if (id === "more") {
      setMoreOpen((v) => !v);
      return;
    }
    // The select/hand slot is a toggle: clicking the active one flips to the
    // other nav mode instead of being a no-op.
    if (id === "select" && active === "select") {
      setActive("hand");
      return;
    }
    if (id === "hand" && active === "hand") {
      setActive("select");
      return;
    }
    setActive(id);
  };

  const handleUpload = (files: FileList) => {
    const { pan, zoom } = useViewport.getState();
    // Drop uploaded images near the viewport center in world coordinates.
    const cx = (window.innerWidth / 2 - pan.x) / zoom;
    const cy = (window.innerHeight / 2 - pan.y) / zoom;
    void ingestFiles(files, { x: cx, y: cy });
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="pointer-events-auto absolute left-[14px] top-1/2 z-30 -translate-y-1/2 flex flex-col items-center gap-2"
    >
      {/* Floating AI orb above the toolbar panel */}
      <button
        type="button"
        onClick={() => setAiOpen((v) => !v)}
        aria-label="Sidekick AI"
        aria-pressed={aiOpen}
        className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[var(--shadow-md)] transition-transform hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, var(--accent) 0%, #c97a1f 100%)" }}
      >
        <Sparkles size={17} strokeWidth={2} />
      </button>

    <motion.aside
      initial={false}
      className="flex flex-col items-center gap-0.5 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-1.5 shadow-[var(--shadow-md)]"
    >
      {/* Single nav slot — icon reflects current mode; clicking toggles. */}
      {(() => {
        const navTool = active === "hand" ? handToolDef : selectToolDef;
        return (
          <ToolButton
            tool={navTool}
            active={active === "select" || active === "hand"}
            onClick={() => handleToolClick(navTool.id)}
            stagger={staggerFor(navTool.id)}
          />
        );
      })()}
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
      <div className="relative">
        {structureTools.map((t) => (
          <ToolButton
            key={t.id}
            tool={t}
            active={t.id === "more" ? moreOpen : active === t.id}
            onClick={() => handleToolClick(t.id)}
            stagger={staggerFor(t.id)}
          />
        ))}
        <MorePopover
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          onUploadFiles={handleUpload}
          onOpenAiGenerate={() => setAiOpen(true)}
        />
      </div>
    </motion.aside>
    </motion.div>
      <AiGenerateDialog open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
