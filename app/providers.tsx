"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useActivity } from "./lib/activity-store";
import { useBoards } from "./lib/boards-store";
import { getPeerColor } from "./lib/presence-store";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Sync the signed-in user into the activity store so log entries get the
 *  correct name/initials/color. No-op while the session is still loading. */
function ActivityUserSync() {
  const { data: session } = useSession();
  useEffect(() => {
    if (!session?.user) return;
    const name = session.user.name ?? session.user.email;
    if (!name) return;
    const userId = session.user.id ?? name;
    useActivity.getState().setCurrentUser({
      name,
      initials: initialsOf(name),
      color: getPeerColor(userId),
    });
  }, [session?.user?.name, session?.user?.email, session?.user?.id]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useBoards.getState().loadBoards();
  }, []);

  return (
    <SessionProvider>
      <ActivityUserSync />
      {children}
    </SessionProvider>
  );
}
