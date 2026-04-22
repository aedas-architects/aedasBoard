import { auth } from "@/auth";
import { upsertBoard } from "@/app/lib/cosmos";
import type { BoardDoc } from "@/app/lib/cosmos";
import type { Item } from "@/app/lib/board-store";
import { rateLimit, rateLimited } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

type AdsFile = {
  version: number;
  exportedAt: number;
  board: { name: string; icon: BoardDoc["icon"]; createdAt: number };
  items: Item[];
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;

  // Imports write a full board document — cap to slow down mass-upload abuse.
  const limit = rateLimit(`import:${uid}`, 3, 6);
  if (!limit.ok) return rateLimited(limit);

  try {
    const body = await req.json() as AdsFile;
    if (body.version !== 1 || !Array.isArray(body.items)) {
      return Response.json({ error: "Invalid .ads file" }, { status: 400 });
    }
    const now = Date.now();
    const doc: BoardDoc = {
      id: `b_${Math.random().toString(36).slice(2, 9)}${now.toString(36).slice(-3)}`,
      userId: uid,
      name: body.board?.name ?? "Imported board",
      icon: body.board?.icon ?? "folder",
      createdAt: body.board?.createdAt ?? now,
      updatedAt: now,
      items: body.items,
    };
    await upsertBoard(doc);
    return Response.json(doc, { status: 201 });
  } catch (err) {
    console.error("[boards-import]", err); return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
