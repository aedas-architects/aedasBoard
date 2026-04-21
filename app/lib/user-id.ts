"use client";

import { useSession } from "next-auth/react";

/**
 * Returns the authenticated user's Entra ID.
 * Falls back to an anonymous localStorage ID if the session isn't ready yet
 * (e.g. on first render before the session loads).
 */
export function getUserId(): string {
  if (typeof window === "undefined") return "server";
  // Prefer the session user ID stored by the Providers SessionProvider.
  // next-auth stores it in a cookie we can't read directly client-side,
  // so callers that need the live ID should use useUserId() hook instead.
  const fallback = localStorage.getItem("aedas.userId") ?? `u_${crypto.randomUUID()}`;
  if (!localStorage.getItem("aedas.userId")) localStorage.setItem("aedas.userId", fallback);
  return fallback;
}

/** React hook — returns the real Entra user ID once the session loads. */
export function useUserId(): string {
  const { data: session } = useSession();
  return session?.user?.id ?? getUserId();
}
