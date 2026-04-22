import { auth } from "@/auth";
import { generateInviteToken, revokeInviteToken, getBoard } from "@/app/lib/cosmos";
import { rateLimit, rateLimited } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// POST /api/boards/[id]/invite — generate (or regenerate) an invite link
export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // Invite tokens unlock board access — keep the rate low to make
  // token-rotation spam unattractive.
  const limit = rateLimit(`invite:${session.user.id}`, 5, 10);
  if (!limit.ok) return rateLimited(limit);
  const { id } = await params;

  try {
    const token = await generateInviteToken(session.user.id, id);
    return Response.json({ token });
  } catch (err) {
    console.error("[boards-[id]-invite]", err); return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/boards/[id]/invite — return current invite status (token + collaborators)
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const board = await getBoard(session.user.id, id);
    if (!board) return Response.json({ error: "Not found" }, { status: 404 });

    const hasToken = !!(board.inviteToken && (!board.inviteExpiry || board.inviteExpiry > Date.now()));
    return Response.json({
      inviteToken: hasToken ? board.inviteToken : null,
      members: board.members ?? [],
      ownerName: board.ownerName ?? "You",
    });
  } catch (err) {
    console.error("[boards-[id]-invite]", err); return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/boards/[id]/invite — revoke the invite link
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    await revokeInviteToken(session.user.id, id);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[boards-[id]-invite]", err); return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
