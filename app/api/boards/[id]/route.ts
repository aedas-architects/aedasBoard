import { auth } from "@/auth";
import { getBoard, getBoardById, upsertBoard, deleteBoard } from "@/app/lib/cosmos";
import type { BoardDoc } from "@/app/lib/cosmos";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// GET /api/boards/[id]
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  try {
    // Try owner lookup first (fast, uses partition key), then fall back to
    // cross-partition lookup for boards shared with this user.
    let doc = await getBoard(uid, id);
    if (!doc) doc = await getBoardById(id);
    if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

    // Only the owner or a collaborator may read the board.
    const canRead = doc.userId === uid || doc.sharedWith?.includes(uid);
    if (!canRead) return Response.json({ error: "Forbidden" }, { status: 403 });

    return Response.json(doc);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/boards/[id]
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  try {
    // Owner lookup first (fast), then cross-partition for collaborators.
    let existing = await getBoard(uid, id);
    if (!existing) existing = await getBoardById(id);
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    const canWrite = existing.userId === uid || existing.sharedWith?.includes(uid);
    if (!canWrite) return Response.json({ error: "Forbidden" }, { status: 403 });

    const patch = await req.json() as Partial<BoardDoc>;
    // Always preserve the original owner's userId as the partition key.
    const updated: BoardDoc = { ...existing, ...patch, id, userId: existing.userId, updatedAt: Date.now() };
    await upsertBoard(updated);
    return Response.json(updated);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/boards/[id] — fallback for sendBeacon which can only POST.
// Requires ?method=PATCH query param; delegates to PATCH.
export async function POST(req: Request, ctx: Params) {
  const url = new URL(req.url);
  if (url.searchParams.get("method") !== "PATCH") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  return PATCH(req, ctx);
}

// DELETE /api/boards/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    await deleteBoard(session.user.id, id);
    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
