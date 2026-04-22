import { auth } from "@/auth";
import {
  deleteTeamDoc,
  getTeam,
  upsertTeam,
  type TeamDoc,
  type TeamMember,
} from "@/app/lib/cosmos";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function sanitizeMembers(raw: unknown): TeamMember[] {
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  return raw
    .map((m) => m as Partial<TeamMember>)
    .filter((m) => typeof m.userId === "string" && typeof m.email === "string")
    .map((m) => ({
      userId: m.userId!,
      name: typeof m.name === "string" && m.name ? m.name : (m.email ?? ""),
      email: m.email!,
      addedAt: typeof m.addedAt === "number" ? m.addedAt : now,
    }));
}

// PATCH /api/teams/[id] — rename and/or replace the member list.
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;
  const { id } = await params;

  try {
    const existing = await getTeam(uid, id);
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    const body = await req.json() as Partial<TeamDoc>;
    const updated: TeamDoc = {
      ...existing,
      ...(typeof body.name === "string" ? { name: body.name.trim() || existing.name } : {}),
      ...("members" in body ? { members: sanitizeMembers(body.members) } : {}),
      id,
      userId: uid,
      updatedAt: Date.now(),
    };
    await upsertTeam(updated);
    return Response.json(updated);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/teams/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await deleteTeamDoc(session.user.id, id);
    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
