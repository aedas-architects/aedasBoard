"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTeams, type TeamMember } from "../../lib/teams-store";

type GraphPerson = {
  id: string;
  name: string;
  email: string;
  jobTitle?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function CreateTeamModal({
  open,
  onClose,
  editingTeamId,
}: {
  open: boolean;
  onClose: () => void;
  editingTeamId?: string | null;
}) {
  const createTeam = useTeams((s) => s.createTeam);
  const updateTeam = useTeams((s) => s.updateTeam);
  const teams = useTeams((s) => s.teams);
  const editing = editingTeamId ? teams.find((t) => t.id === editingTeamId) : null;

  const [name, setName] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GraphPerson[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [entraAvailable, setEntraAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset when opening; pre-fill when editing.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setMembers(editing.members);
    } else {
      setName("");
      setMembers([]);
    }
    setQuery("");
    setResults(null);
    setEntraAvailable(null);
    setTimeout(() => nameInputRef.current?.focus(), 10);
  }, [open, editing]);

  // Debounced Graph search.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    const h = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setResults([]);
          setEntraAvailable(false);
          return;
        }
        // The API signals Entra unavailability via a header when it returns
        // an empty array without having tried Graph.
        const header = res.headers.get("X-Entra-Available");
        if (header === "false") setEntraAvailable(false);
        else setEntraAvailable(true);
        const list = (await res.json()) as GraphPerson[];
        setResults(list);
      } catch {
        setResults([]);
        setEntraAvailable(false);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(h);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const alreadyAdded = useMemo(() => new Set(members.map((m) => m.userId)), [members]);

  const addPerson = (p: GraphPerson) => {
    if (alreadyAdded.has(p.id)) return;
    setMembers((prev) => [
      ...prev,
      { userId: p.id, name: p.name, email: p.email, addedAt: Date.now() },
    ]);
    setQuery("");
    setResults(null);
  };

  const addManual = () => {
    const q = query.trim();
    if (!isValidEmail(q)) return;
    // Use email as both id and display name until Graph resolution is available.
    const fake: TeamMember = {
      userId: q.toLowerCase(),
      name: q,
      email: q,
      addedAt: Date.now(),
    };
    if (alreadyAdded.has(fake.userId)) return;
    setMembers((prev) => [...prev, fake]);
    setQuery("");
    setResults(null);
  };

  const removeMember = (userId: string) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const canSubmit = name.trim().length > 0 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateTeam(editing.id, { name: name.trim(), members });
      } else {
        await createTeam({ name: name.trim(), members });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]"
          />
          <motion.div
            key="modal"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-lg)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] bg-panel-soft text-ink-soft">
                  <Users size={14} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold text-ink">
                    {editing ? "Edit team" : "Create a team"}
                  </div>
                  <div className="font-mono text-[10.5px] text-muted">
                    {editing ? "Update name or member list" : "Group people to share boards with"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] text-ink-soft hover:bg-panel-soft hover:text-ink"
                aria-label="Close"
              >
                <X size={14} strokeWidth={1.8} />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-4 px-5 py-4">
              {/* Name */}
              <div>
                <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
                  Team name
                </label>
                <input
                  ref={nameInputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Design review"
                  className="w-full rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:border-ink/20 focus:bg-panel"
                />
              </div>

              {/* Member search */}
              <div>
                <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
                  Members
                </label>
                <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 focus-within:border-ink/20 focus-within:bg-panel">
                  <Search size={13} strokeWidth={1.8} className="text-muted" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isValidEmail(query.trim())) {
                        e.preventDefault();
                        addManual();
                      }
                    }}
                    placeholder="Search by name or email…"
                    className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted"
                  />
                  {searching && (
                    <span className="font-mono text-[10px] text-muted">Searching…</span>
                  )}
                </div>

                {/* Results or manual-add hint */}
                {results && results.length > 0 && (
                  <div className="mt-2 max-h-[180px] overflow-y-auto rounded-[var(--r-md)] border border-[var(--line)] bg-panel">
                    {results.map((p) => {
                      const added = alreadyAdded.has(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addPerson(p)}
                          disabled={added}
                          className={`flex w-full items-center gap-2.5 border-b border-[var(--line)] px-3 py-2 text-left last:border-b-0 ${
                            added
                              ? "cursor-not-allowed opacity-60"
                              : "hover:bg-panel-soft"
                          }`}
                        >
                          <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink text-[10.5px] font-semibold text-white">
                            {initials(p.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium text-ink">
                              {p.name}
                            </div>
                            <div className="truncate font-mono text-[10.5px] text-muted">
                              {p.email}
                              {p.jobTitle ? ` · ${p.jobTitle}` : ""}
                            </div>
                          </div>
                          {added && (
                            <Check size={13} strokeWidth={2} className="text-[var(--accent)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {results && results.length === 0 && query.trim().length >= 2 && (
                  <div className="mt-2 rounded-[var(--r-md)] border border-dashed border-[var(--line)] px-3 py-2.5 text-[12px] text-muted">
                    {entraAvailable === false ? (
                      <>
                        Directory search isn&apos;t available.
                        {isValidEmail(query.trim()) ? (
                          <button
                            type="button"
                            onClick={addManual}
                            className="ml-1 font-medium text-ink hover:underline"
                          >
                            Add &quot;{query.trim()}&quot; manually
                          </button>
                        ) : (
                          <> Enter a full email to add manually.</>
                        )}
                      </>
                    ) : isValidEmail(query.trim()) ? (
                      <>
                        No match in directory.{" "}
                        <button
                          type="button"
                          onClick={addManual}
                          className="font-medium text-ink hover:underline"
                        >
                          Add &quot;{query.trim()}&quot; as external
                        </button>
                      </>
                    ) : (
                      <>No matches. Try a different spelling or enter an email.</>
                    )}
                  </div>
                )}
              </div>

              {/* Chosen members */}
              {members.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <span
                      key={m.userId}
                      className="group flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-soft)] py-1 pl-1 pr-2"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[9px] font-semibold text-white">
                        {initials(m.name)}
                      </span>
                      <span className="max-w-[140px] truncate text-[12px] text-ink">
                        {m.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMember(m.userId)}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-panel hover:text-ink"
                        aria-label={`Remove ${m.name}`}
                      >
                        <X size={10} strokeWidth={2} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3">
              <div className="font-mono text-[10.5px] text-muted">
                {members.length === 0
                  ? "No members yet"
                  : `${members.length} member${members.length === 1 ? "" : "s"}`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[var(--r-md)] px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:bg-panel-soft hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  className="flex items-center gap-1.5 rounded-[var(--r-md)] bg-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--panel-soft)] hover:bg-[#0e0e0e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editing ? "Save changes" : "Create team"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
