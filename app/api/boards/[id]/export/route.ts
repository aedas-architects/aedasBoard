import { auth } from "@/auth";
import { getBoard } from "@/app/lib/cosmos";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const doc = await getBoard(session.user.id, id);
    if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

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
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
