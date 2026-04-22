"use client";

import {
  Clock,
  Folder,
  Home,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  User,
  Workflow,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { type Space, type SpaceIcon, useSpaces } from "../../lib/spaces-store";
import { useTeams } from "../../lib/teams-store";
import { TeamSwitcher } from "./team-switcher";

const SPACE_ICONS: Record<SpaceIcon, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>> = {
  folder: Folder,
  flow: Workflow,
  grid: LayoutGrid,
  user: User,
};

const SPACE_TINT: Record<SpaceIcon, string> = {
  folder: "#c97a1f",
  flow: "#d94a38",
  grid: "#7C3AED",
  user: "#2E8B57",
};

export type HomeView =
  | { type: "home" }
  | { type: "recent" }
  | { type: "starred" }
  | { type: "space"; id: string }
  | { type: "team"; id: string };

function isActiveView(a: HomeView, b: HomeView): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "space" && b.type === "space") return a.id === b.id;
  if (a.type === "team" && b.type === "team") return a.id === b.id;
  return true;
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  count,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-[13px] transition-colors ${
        active
          ? "bg-panel-soft font-medium text-ink"
          : "text-ink-soft hover:bg-panel-soft hover:text-ink"
      }`}
    >
      <Icon size={15} strokeWidth={1.8} className="flex-none" />
      <span className="flex-1 text-left">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span className="font-mono text-[10.5px] text-muted">{count}</span>
      )}
    </button>
  );
}

const SPACE_ICON_OPTIONS: SpaceIcon[] = ["folder", "flow", "grid", "user"];

function SpaceRow({
  space,
  active,
  count,
  onSelect,
  onRename,
  onChangeIcon,
  onDelete,
}: {
  space: Space;
  active: boolean;
  count?: number;
  onSelect: () => void;
  onRename: (name: string) => void;
  onChangeIcon: (icon: SpaceIcon) => void;
  onDelete: () => void;
}) {
  const Icon = SPACE_ICONS[space.icon];
  const tint = SPACE_TINT[space.icon];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(space.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !iconPickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setIconPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen, iconPickerOpen]);

  const commit = () => {
    const name = draft.trim();
    if (name && name !== space.name) onRename(name);
    else setDraft(space.name);
    setEditing(false);
  };

  const rowClasses = `group flex items-center gap-2 rounded-[var(--r-md)] px-3 py-2 text-[13px] transition-colors ${
    active
      ? "bg-panel-soft font-medium text-ink"
      : "text-ink-soft hover:bg-panel-soft hover:text-ink"
  }`;

  if (editing) {
    // Editing mode — no wrapping button so the input's focus doesn't trigger
    // a focus ring on a parent button. Plain div + input.
    return (
      <div className={rowClasses}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Icon size={15} strokeWidth={1.8} className="flex-none" style={{ color: tint }} />
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              else if (e.key === "Escape") {
                setDraft(space.name);
                setEditing(false);
              }
            }}
            className="flex-1 bg-transparent text-[13px] text-ink outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={rowClasses}>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
      >
        <Icon size={15} strokeWidth={1.8} className="flex-none" style={{ color: tint }} />
        <span className="truncate">{space.name}</span>
      </button>

      {typeof count === "number" && count > 0 && (
        <span className="font-mono text-[10.5px] text-muted group-hover:opacity-0 transition-opacity">
          {count}
        </span>
      )}

      <div className="relative opacity-0 transition-opacity group-hover:opacity-100" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
            setIconPickerOpen(false);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-muted hover:bg-panel hover:text-ink"
          aria-label="Space options"
        >
          <MoreHorizontal size={13} strokeWidth={1.8} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -2 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-7 z-30 w-44 rounded-[var(--r-md)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-md)]"
            >
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-[var(--r-sm)] px-2 py-1.5 text-[12.5px] text-ink-soft hover:bg-panel-soft hover:text-ink"
              >
                Rename
              </button>

              {/* Change icon — inline picker to keep positioning simple */}
              <button
                type="button"
                onClick={() => setIconPickerOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-[var(--r-sm)] px-2 py-1.5 text-[12.5px] text-ink-soft hover:bg-panel-soft hover:text-ink"
              >
                <span>Change icon</span>
                <span className="font-mono text-[10px] text-muted">{iconPickerOpen ? "▾" : "▸"}</span>
              </button>
              {iconPickerOpen && (
                <div className="mx-1 mb-1 mt-0.5 flex items-center gap-1 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--panel-soft)] p-1">
                  {SPACE_ICON_OPTIONS.map((key) => {
                    const OptIcon = SPACE_ICONS[key];
                    const optTint = SPACE_TINT[key];
                    const selected = space.icon === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          onChangeIcon(key);
                          setIconPickerOpen(false);
                          setMenuOpen(false);
                        }}
                        title={key}
                        className={`flex h-7 w-7 flex-1 items-center justify-center rounded-[var(--r-sm)] transition-colors ${
                          selected ? "bg-panel border border-[var(--line)] shadow-[var(--shadow-sm)]" : "hover:bg-panel"
                        }`}
                      >
                        <OptIcon size={14} strokeWidth={1.8} style={{ color: optTint }} />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="my-0.5 h-px bg-[var(--line)]" />

              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-[var(--r-sm)] px-2 py-1.5 text-[12.5px] text-red-500 hover:bg-red-500/10"
              >
                Delete space
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


export function HomeSidebar({
  view,
  onViewChange,
  query,
  onQueryChange,
  allCount,
  recentCount,
  starredCount,
  spaceBoardCount,
  onCreateTeam,
}: {
  view: HomeView;
  onViewChange: (v: HomeView) => void;
  query: string;
  onQueryChange: (q: string) => void;
  allCount: number;
  recentCount: number;
  starredCount: number;
  /** Maps space.id → number of boards in that space. */
  spaceBoardCount: Record<string, number>;
  onCreateTeam: () => void;
}) {
  const spaces = useSpaces((s) => s.spaces);
  const spacesHydrated = useSpaces((s) => s.hydrated);
  const hydrateSpaces = useSpaces((s) => s.hydrate);
  const createSpace = useSpaces((s) => s.createSpace);
  const renameSpace = useSpaces((s) => s.renameSpace);
  const setSpaceIcon = useSpaces((s) => s.setSpaceIcon);
  const deleteSpace = useSpaces((s) => s.deleteSpace);

  const teamsHydrated = useTeams((s) => s.hydrated);
  const hydrateTeams = useTeams((s) => s.hydrate);

  useEffect(() => {
    if (!spacesHydrated) hydrateSpaces();
  }, [spacesHydrated, hydrateSpaces]);
  useEffect(() => {
    if (!teamsHydrated) hydrateTeams();
  }, [teamsHydrated, hydrateTeams]);

  const onCreateSpace = async () => {
    const space = await createSpace({ name: "New space" });
    if (space) onViewChange({ type: "space", id: space.id });
  };

  return (
    <aside className="flex h-screen w-[260px] flex-none flex-col border-r border-[var(--line)] bg-bg">
      {/* Team switcher — workspace context at the top, Miro-style. */}
      <TeamSwitcher view={view} onViewChange={onViewChange} onCreateTeam={onCreateTeam} />

      {/* Search */}
      <div className="px-4">
        <div className="flex items-center gap-2 rounded-[var(--r-xl)] border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 focus-within:border-ink/20 focus-within:bg-panel transition-colors">
          <Search size={14} strokeWidth={1.8} className="text-muted" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search boards"
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Primary nav */}
      <nav className="mt-6 flex flex-col gap-1 px-3">
        <NavItem
          icon={Home}
          label="Home"
          active={isActiveView(view, { type: "home" })}
          onClick={() => onViewChange({ type: "home" })}
          count={allCount}
        />
        <NavItem
          icon={Clock}
          label="Recent"
          active={isActiveView(view, { type: "recent" })}
          onClick={() => onViewChange({ type: "recent" })}
          count={recentCount}
        />
        <NavItem
          icon={Star}
          label="Starred"
          active={isActiveView(view, { type: "starred" })}
          onClick={() => onViewChange({ type: "starred" })}
          count={starredCount}
        />
      </nav>

      {/* Scrollable region holding both Spaces and Teams sections. */}
      <div className="mt-8 flex-1 overflow-y-auto pb-5" style={{ scrollbarWidth: "thin" }}>
        {/* Spaces header */}
        <div className="flex items-center justify-between px-5">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
            Spaces
          </span>
          <button
            type="button"
            onClick={onCreateSpace}
            className="flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-muted hover:bg-panel-soft hover:text-ink"
            aria-label="New space"
            title="New space"
          >
            <Plus size={13} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-2 px-3">
          {spaces.length === 0 ? (
            <p className="px-3 py-2 text-[11.5px] leading-snug text-muted">
              Group boards into folders. Click <span className="font-medium text-ink-soft">+</span> to create one.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {spaces.map((sp) => (
                <SpaceRow
                  key={sp.id}
                  space={sp}
                  count={spaceBoardCount[sp.id]}
                  active={view.type === "space" && view.id === sp.id}
                  onSelect={() => onViewChange({ type: "space", id: sp.id })}
                  onRename={(name) => renameSpace(sp.id, name)}
                  onChangeIcon={(icon) => setSpaceIcon(sp.id, icon)}
                  onDelete={() => {
                    deleteSpace(sp.id);
                    if (view.type === "space" && view.id === sp.id) {
                      onViewChange({ type: "home" });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

      </div>

    </aside>
  );
}

/**
 * User avatar + dropdown, rendered in the main page header (top-right).
 * Exposed separately from the sidebar so the caller can mount it in the
 * right cluster of the page header (matching Miro's layout).
 */
export function HomeUserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const name = session?.user?.name ?? session?.user?.email ?? "Account";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--line)] bg-panel text-[12px] font-semibold text-ink shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--accent)]"
        title={name}
        aria-label="Account menu"
      >
        {userInitials(name)}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-11 z-30 w-56 rounded-[var(--r-xl)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-lg)]"
          >
            <div className="mb-1 border-b border-[var(--line)] px-3 py-2">
              <p className="truncate text-[13px] font-medium text-ink">
                {session?.user?.name ?? "Signed in"}
              </p>
              <p className="truncate font-mono text-[10.5px] text-muted">
                {session?.user?.email ?? ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-[var(--r-md)] px-3 py-2 text-[13px] text-ink-soft transition-colors hover:bg-panel-soft hover:text-red-500"
            >
              <LogOut size={14} strokeWidth={1.8} />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
