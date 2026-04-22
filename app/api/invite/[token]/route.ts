import { auth } from "@/auth";
import { acceptInvite } from "@/app/lib/cosmos";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

// POST /api/invite/[token] — accept an invite, add current user as collaborator
export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;

  try {
    const board = await acceptInvite(token, {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });
    if (!board) return Response.json({ error: "Invite invalid or expired" }, { status: 410 });
    return Response.json({ boardId: board.id, boardName: board.name });
  } catch (err) {
    console.error("[invite-[token]]", err); return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
