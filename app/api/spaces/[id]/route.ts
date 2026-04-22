import { auth } from "@/auth";
import {
  clearSpaceIdOnBoards,
  deleteSpaceDoc,
  getSpace,
  upsertSpace,
  type SpaceDoc,
  type SpaceIcon,
} from "@/app/lib/cosmos";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const ICONS: SpaceIcon[] = ["folder", "flow", "grid", "user"];
function isIcon(v: unknown): v is SpaceIcon {
  return typeof v === "string" && (ICONS as string[]).includes(v);
}

// PATCH /api/spaces/[id] — rename or change icon
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  try {
    const existing = await getSpace(uid, id);
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    const body = await req.json() as Partial<SpaceDoc>;
    const updated: SpaceDoc = {
      ...existing,
      ...(typeof body.name === "string" ? { name: body.name } : {}),
      ...(isIcon(body.icon) ? { icon: body.icon } : {}),
      id,
      userId: uid,
      updatedAt: Date.now(),
    };
    await upsertSpace(updated);
    return Response.json(updated);
  } catch (err) {
    console.error("[spaces-[id]]", err); return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/spaces/[id] — delete space and unfile its boards
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  try {
    await clearSpaceIdOnBoards(uid, id);
    await deleteSpaceDoc(uid, id);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[spaces-[id]]", err); return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
