import { auth } from "@/auth";
import { readGraphToken, searchPeople } from "@/app/lib/graph";

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
      // Surface the Graph status so the client (and the dev console) can show
      // exactly why things are empty — e.g. 403 = consent still missing,
      // 401 = expired token, 400 = bad query.
      return Response.json([], {
        headers: {
          "X-Entra-Available": "false",
          "X-Entra-Reason": `graph-${result.status}`,
          "X-Entra-Error": result.error.slice(0, 400),
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
    return Response.json([], {
      headers: {
        "X-Entra-Available": "false",
        "X-Entra-Reason": "unexpected-exception",
        "X-Entra-Error": String(err).slice(0, 400),
      },
    });
  }
}
