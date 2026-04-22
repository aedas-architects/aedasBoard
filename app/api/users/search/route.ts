import { auth } from "@/auth";
import { readGraphToken, searchPeople } from "@/app/lib/graph";
import { rateLimit, rateLimited } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

// GET /api/users/search?q=... — search the Entra directory for people
// matching `q` by display name / email / UPN. Returns [] (and diagnostic
// headers) when the caller doesn't have a usable Graph token or Graph
// refuses the query.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Typeahead is naturally bursty — allow a burst of 15, refill 30/min.
  const limit = rateLimit(`usearch:${session.user.id}`, 15, 30);
  if (!limit.ok) return rateLimited(limit);

  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return Response.json([]);

  const token = await readGraphToken(req);
  if (!token) {
    return Response.json([], {
      headers: {
        "X-Entra-Available": "false",
        "X-Entra-Reason": "no-token-on-session",
      },
    });
  }

  try {
    const result = await searchPeople(token, q, 10);
    if (!result.ok) {
      // Log the raw Graph error server-side for debugging; only expose the
      // HTTP status code to the browser. Returning raw Graph error bodies
      // could leak tenant-internal details (object ids, tenant names, etc).
      console.warn("[users/search] graph failed", { status: result.status, error: result.error });
      return Response.json([], {
        headers: {
          "X-Entra-Available": "false",
          "X-Entra-Reason": `graph-${result.status}`,
        },
      });
    }
    return Response.json(
      result.users.map((u) => ({
        id: u.id,
        name: u.displayName,
        email: u.mail ?? u.userPrincipalName ?? "",
        jobTitle: u.jobTitle ?? "",
      })),
    );
  } catch (err) {
    console.error("[users/search]", err);
    return Response.json([], {
      headers: {
        "X-Entra-Available": "false",
        "X-Entra-Reason": "unexpected-exception",
      },
    });
  }
}
