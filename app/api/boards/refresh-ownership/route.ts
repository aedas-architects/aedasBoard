import { auth } from "@/auth";
import { listBoards, upsertBoard } from "@/app/lib/cosmos";
import { rateLimit, rateLimited } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/boards/refresh-ownership
 *
 * Force-rewrites `ownerName` and `ownerEmail` on every board the caller
 * owns, using their current session display info. Safe to re-run; used as
 * a one-click cleanup after a display-name change or a testing spree where
 * docs got stamped with a stale identity.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;

  // Conservative limit — this enumerates and patches every board the user
  // owns. One call per minute is plenty.
  const limit = rateLimit(`refresh-own:${uid}`, 1, 1);
  if (!limit.ok) return rateLimited(limit);

  const ownerName = session.user.name ?? session.user.email ?? "";
  const ownerEmail = session.user.email ?? "";
  if (!ownerName) {
    return Response.json({ error: "Session has no name/email to apply" }, { status: 400 });
  }

  try {
    const boards = await listBoards(uid);
    const owned = boards.filter((b) => b.userId === uid);
    let patched = 0;
    for (const b of owned) {
      if (b.ownerName === ownerName && (b.ownerEmail ?? "") === ownerEmail) continue;
      await upsertBoard({ ...b, ownerName, ownerEmail });
      patched++;
    }
    return Response.json({ scanned: owned.length, patched });
  } catch (err) {
    console.error("[boards/refresh-ownership]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
