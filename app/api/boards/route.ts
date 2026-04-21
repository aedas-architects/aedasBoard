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
    boards.sort((a, b) => b.updatedAt - a.updatedAt);
    return Response.json(boards);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/boards — create a new board
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;

  try {
    const body = await req.json() as Partial<BoardDoc>;
    const now = Date.now();
    const doc: BoardDoc = {
      id: body.id ?? `b_${Math.random().toString(36).slice(2, 9)}${now.toString(36).slice(-3)}`,
      userId: uid,
      name: body.name ?? "Untitled board",
      icon: body.icon ?? "folder",
      createdAt: body.createdAt ?? now,
      updatedAt: now,
      items: body.items ?? [],
    };
    await upsertBoard(doc);
    return Response.json(doc, { status: 201 });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
