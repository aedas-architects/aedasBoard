import { auth } from "@/auth";
import { getBoard, getBoardById } from "@/app/lib/cosmos";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  try {
    // Match the GET /api/boards/[id] access model: owner OR sharedWith
    // collaborators can export. Fast path via partition key first, then
    // cross-partition fallback for collaborators.
    let doc = await getBoard(uid, id);
    if (!doc) doc = await getBoardById(id);
    if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
    const canRead = doc.userId === uid || !!doc.sharedWith?.includes(uid);
    if (!canRead) return Response.json({ error: "Forbidden" }, { status: 403 });

    const adsFile = JSON.stringify({
      version: 1,
      exportedAt: Date.now(),
      board: { name: doc.name, icon: doc.icon, createdAt: doc.createdAt },
      items: doc.items,
    }, null, 2);

    const safeName = doc.name.replace(/[^a-z0-9_\-\s]/gi, "").trim().replace(/\s+/g, "-") || "board";

    return new Response(adsFile, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}.ads"`,
      },
    });
  } catch (err) {
    console.error("[api/boards/[id]/export]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
