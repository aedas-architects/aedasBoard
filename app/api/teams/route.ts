import { auth } from "@/auth";
import { listTeams, upsertTeam } from "@/app/lib/cosmos";
import type { TeamDoc, TeamMember } from "@/app/lib/cosmos";

export const runtime = "nodejs";

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

// GET /api/teams — list teams owned by the caller.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const teams = await listTeams(session.user.id);
    return Response.json(teams);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/teams — create a team.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as Partial<TeamDoc>;
    const now = Date.now();
    const doc: TeamDoc = {
      id: body.id ?? `t_${Math.random().toString(36).slice(2, 9)}${now.toString(36).slice(-3)}`,
      userId: session.user.id,
      name: body.name?.trim() || "New team",
      members: sanitizeMembers(body.members),
      createdAt: body.createdAt ?? now,
      updatedAt: now,
    };
    await upsertTeam(doc);
    return Response.json(doc, { status: 201 });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
