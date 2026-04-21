"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { useBoards } from "./lib/boards-store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useBoards.getState().loadBoards();
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
