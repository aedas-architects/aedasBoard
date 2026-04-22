"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTeams } from "../../lib/teams-store";
import type { HomeView } from "./home-sidebar";

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Simple stable color from the team id so each team has a consistent tint. */
const TEAM_COLORS = [
  "#D94A38",
  "#7C3AED",
  "#2E8B57",
  "#c97a1f",
  "#0EA5E9",
  "#E11D48",
];
function teamColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TEAM_COLORS[h % TEAM_COLORS.length];
}

/**
 * Compact card at the top of the sidebar that mirrors Miro's team selector.
 * Shows the currently-selected team (or "Personal" when none is active) and
 * opens a dropdown to switch between teams. The `+` button creates a new team
 * via the existing create-team modal.
 */
export function TeamSwitcher({
  view,
  onViewChange,
  onCreateTeam,
}: {
  view: HomeView;
  onViewChange: (v: HomeView) => void;
  onCreateTeam: () => void;
}) {
  const teams = useTeams((s) => s.teams);
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

  const activeTeam = view.type === "team" ? teams.find((t) => t.id === view.id) : null;
  const label = activeTeam ? "Team" : "Workspace";
  const name = activeTeam ? activeTeam.name : "Personal";
  const color = activeTeam ? teamColor(activeTeam.id) : "var(--accent)";
  const initials = activeTeam ? teamInitials(activeTeam.name) : "PE";

  return (
    <div className="relative flex items-center gap-2 px-4 pt-5 pb-4" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--r-md)] px-1.5 py-1.5 text-left hover:bg-panel-soft"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div
          className="flex h-7 w-7 flex-none items-center justify-center rounded-[var(--r-sm)] text-[10.5px] font-semibold text-white"
          style={{ background: color }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted">
            {label}
          </div>
          <div className="truncate text-[13px] font-semibold text-ink">
            {name}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={onCreateTeam}
        className="flex h-7 w-7 flex-none items-center justify-center rounded-[var(--r-sm)] border border-[var(--line)] text-muted hover:bg-panel-soft hover:text-ink"
        aria-label="New team"
        title="New team"
      >
        <Plus size={13} strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-3 right-3 top-[calc(100%-4px)] z-30 rounded-[var(--r-xl)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-lg)]"
            role="menu"
          >
            <div className="mb-1 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Switch team
            </div>

            <button
              type="button"
              onClick={() => {
                onViewChange({ type: "home" });
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-2 py-1.5 text-left hover:bg-panel-soft"
              role="menuitem"
            >
              <div
                className="flex h-6 w-6 flex-none items-center justify-center rounded-[var(--r-sm)] text-[9.5px] font-semibold text-white"
                style={{ background: "var(--accent)" }}
              >
                PE
              </div>
              <span className="flex-1 truncate text-[12.5px] text-ink">Personal</span>
              {!activeTeam && <Check size={12} strokeWidth={2} className="text-[var(--accent)]" />}
            </button>

            {teams.length > 0 && <div className="my-1 h-px bg-[var(--line)]" />}

            {teams.map((t) => {
              const isActive = activeTeam?.id === t.id;
              const c = teamColor(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onViewChange({ type: "team", id: t.id });
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-2 py-1.5 text-left hover:bg-panel-soft"
                  role="menuitem"
                >
                  <div
                    className="flex h-6 w-6 flex-none items-center justify-center rounded-[var(--r-sm)] text-[9.5px] font-semibold text-white"
                    style={{ background: c }}
                  >
                    {teamInitials(t.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] text-ink">{t.name}</div>
                    <div className="truncate font-mono text-[10px] text-muted">
                      {t.members.length} {t.members.length === 1 ? "member" : "members"}
                    </div>
                  </div>
                  {isActive && <Check size={12} strokeWidth={2} className="text-[var(--accent)]" />}
                </button>
              );
            })}

            <div className="my-1 h-px bg-[var(--line)]" />

            <button
              type="button"
              onClick={() => {
                onCreateTeam();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-[var(--r-md)] px-2 py-1.5 text-left text-[12.5px] text-ink-soft hover:bg-panel-soft hover:text-ink"
              role="menuitem"
            >
              <Users size={13} strokeWidth={1.8} />
              Create new team
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
