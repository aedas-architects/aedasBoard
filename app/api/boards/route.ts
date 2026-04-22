import { auth } from "@/auth";
import { listBoards, upsertBoard } from "@/app/lib/cosmos";
import type { BoardDoc } from "@/app/lib/cosmos";

export const runtime = "nodejs";

// GET /api/boards — list all boards for the signed-in user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;

  try {
    const boards = await listBoards(uid);

    // Drift-correction: for boards the caller owns, make sure the stored
    // ownerName/ownerEmail match their current session. Fixes legacy docs
    // created before stamping existed and docs stamped under a different
    // name (e.g. a shared machine, or name changed in Entra since).
    // Fire-and-forget — no need to block the response on Cosmos writes.
    const sessionName = session.user.name ?? session.user.email ?? undefined;
    const sessionEmail = session.user.email ?? undefined;
    if (sessionName) {
      const stale = boards.filter(
        (b) =>
          b.userId === uid &&
          (b.ownerName !== sessionName || (sessionEmail && b.ownerEmail !== sessionEmail)),
      );
      if (stale.length > 0) {
        // Apply in-memory so the response already reflects the corrected names.
        for (const b of stale) {
          b.ownerName = sessionName;
          if (sessionEmail) b.ownerEmail = sessionEmail;
        }
        // Write back asynchronously — refresh needs a full read to preserve items.
        void refreshOwnerNameAsync(stale.map((b) => b.id), uid, sessionName, sessionEmail);
      }
    }

    boards.sort((a, b) => b.updatedAt - a.updatedAt);
    return Response.json(boards);
  } catch (err) {
    console.error("[boards]", err); return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function refreshOwnerNameAsync(
  ids: string[],
  userId: string,
  ownerName: string,
  ownerEmail: string | undefined,
) {
  const { getBoard, upsertBoard } = await import("@/app/lib/cosmos");
  await Promise.all(
    ids.map(async (id) => {
      try {
        const existing = await getBoard(userId, id);
        if (!existing || existing.userId !== userId) return;
        const updated = {
          ...existing,
          ownerName,
          ...(ownerEmail ? { ownerEmail } : {}),
        };
        await upsertBoard(updated);
      } catch (err) {
        // Never let a healing error escape — the user gets correct names
        // on next load regardless.
        console.warn("[boards] owner-name refresh failed", id, err);
      }
    }),
  );
}

// POST /api/boards — create a new board
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;

  try {
    const body = await req.json() as Partial<BoardDoc>;
    const now = Date.now();
    // Capture the creator's display info on the document so list views
    // can render "by <name>" without a second Entra lookup and without
    // hardcoding.
    const ownerName = session.user.name ?? session.user.email ?? "Unknown";
    const ownerEmail = session.user.email ?? "";
    const doc: BoardDoc = {
      id: body.id ?? `b_${Math.random().toString(36).slice(2, 9)}${now.toString(36).slice(-3)}`,
      userId: uid,
      ownerName,
      ownerEmail,
      name: body.name ?? "Untitled board",
      icon: body.icon ?? "folder",
      createdAt: body.createdAt ?? now,
      updatedAt: now,
      items: body.items ?? [],
    };
    await upsertBoard(doc);
    return Response.json(doc, { status: 201 });
  } catch (err) {
    console.error("[boards]", err); return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
