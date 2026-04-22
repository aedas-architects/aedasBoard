// Server-only. Thin wrapper around Microsoft Graph for directory lookups.
import { getToken } from "next-auth/jwt";

export type GraphUser = {
  id: string;
  displayName: string;
  userPrincipalName?: string;
  mail?: string;
  jobTitle?: string;
};

/** Extract the Graph access token from the encrypted NextAuth JWT cookie. */
export async function readGraphToken(req: Request): Promise<string | null> {
  const token = await getToken({
    // next-auth accepts a plain Request in app router — it reads the cookie.
    req: req as unknown as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET!,
    secureCookie: (process.env.NEXTAUTH_URL ?? "").startsWith("https"),
  });
  const raw = (token as unknown as { graphAccessToken?: string } | null)?.graphAccessToken;
  return raw ?? null;
}

export type GraphSearchResult =
  | { ok: true; users: GraphUser[] }
  | { ok: false; status: number; error: string };

/**
 * Search the directory by name/email. Uses $search (requires the eventual
 * consistency header) and falls back to $filter startswith when the tenant
 * rejects $search. Returns a tagged result so callers can diagnose failures.
 */
export async function searchPeople(
  accessToken: string,
  query: string,
  top = 10,
): Promise<GraphSearchResult> {
  const q = query.trim();
  if (!q) return { ok: true, users: [] };

  // Build the URL with URLSearchParams so the quotes, spaces, and operators
  // are all properly percent-encoded for Graph.
  const searchExpr = `"displayName:${q}" OR "mail:${q}" OR "userPrincipalName:${q}"`;
  const params = new URLSearchParams({
    "$search": searchExpr,
    "$select": "id,displayName,userPrincipalName,mail,jobTitle",
    "$top": String(top),
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ConsistencyLevel: "eventual",
      },
      cache: "no-store",
    },
  );
  if (res.ok) {
    const data = (await res.json()) as { value?: GraphUser[] };
    return { ok: true, users: data.value ?? [] };
  }

  // Capture the Graph error message for the initial attempt so we can bubble
  // it up if the fallback also fails.
  const primaryErr = await res.text().catch(() => "");

  // Fallback — $filter startswith is accepted by tenants that disallow $search.
  const fallback = await searchPeopleFilter(accessToken, q, top);
  if (fallback.ok) return fallback;
  return { ok: false, status: res.status, error: primaryErr || fallback.error };
}

async function searchPeopleFilter(
  accessToken: string,
  q: string,
  top: number,
): Promise<GraphSearchResult> {
  const safe = q.replace(/'/g, "''");
  const filterExpr =
    `startswith(displayName,'${safe}') ` +
    `or startswith(userPrincipalName,'${safe}') ` +
    `or startswith(mail,'${safe}')`;
  const params = new URLSearchParams({
    "$filter": filterExpr,
    "$select": "id,displayName,userPrincipalName,mail,jobTitle",
    "$top": String(top),
  });
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (res.ok) {
    const data = (await res.json()) as { value?: GraphUser[] };
    return { ok: true, users: data.value ?? [] };
  }
  const err = await res.text().catch(() => "");
  return { ok: false, status: res.status, error: err };
}
