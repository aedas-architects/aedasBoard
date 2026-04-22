import { auth } from "@/auth";
import { listSpaces, upsertSpace } from "@/app/lib/cosmos";
import type { SpaceDoc, SpaceIcon } from "@/app/lib/cosmos";

export const runtime = "nodejs";

const ICONS: SpaceIcon[] = ["folder", "flow", "grid", "user"];
function isIcon(v: unknown): v is SpaceIcon {
  return typeof v === "string" && (ICONS as string[]).includes(v);
}

// GET /api/spaces — list all spaces for the signed-in user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const spaces = await listSpaces(session.user.id);
    return Response.json(spaces);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/spaces — create a new space
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as Partial<SpaceDoc>;
    const now = Date.now();
    const icon = isIcon(body.icon) ? body.icon : "folder";
    const doc: SpaceDoc = {
      id: body.id ?? `s_${Math.random().toString(36).slice(2, 9)}${now.toString(36).slice(-3)}`,
      userId: session.user.id,
      name: body.name ?? "New space",
      icon,
      createdAt: body.createdAt ?? now,
      updatedAt: now,
    };
    await upsertSpace(doc);
    return Response.json(doc, { status: 201 });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
