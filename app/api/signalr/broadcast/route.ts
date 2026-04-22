import { createHmac } from "crypto";
import { auth } from "@/auth";
import { getBoard, getBoardById } from "@/app/lib/cosmos";
import type { BoardOp } from "@/app/lib/use-board-collab";

export const runtime = "nodejs";

const HUB = "board";

function parseConnectionString(cs: string): { endpoint: string; key: string } {
  const endpoint = cs.match(/Endpoint=([^;]+)/)?.[1]?.replace(/\/$/, "");
  const key = cs.match(/AccessKey=([^;]+)/)?.[1];
  if (!endpoint || !key) throw new Error("Invalid AZURE_SIGNALR_CONNECTION_STRING");
  return { endpoint, key };
}

function buildServerJwt(audience: string, key: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ aud: audience, iat: now, exp: now + 300 })
  ).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/**
 * Force the authenticated user's id onto an op so a client can't claim to
 * be someone else in the broadcast payload. `chat:message` carries the id
 * nested on `message.userId`; every other op has it at the top level.
 * Shapes without a userId (e.g. cursor:move missing fields) are left as-is.
 */
function stampUserId(op: BoardOp, userId: string): BoardOp {
  if (op.type === "chat:message") {
    return { ...op, message: { ...op.message, userId } };
  }
  if ("userId" in op) {
    return { ...op, userId } as BoardOp;
  }
  return op;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;

  const cs = process.env.AZURE_SIGNALR_CONNECTION_STRING;
  if (!cs) {
    // No SignalR configured — silently succeed so local dev works without it.
    return new Response(null, { status: 204 });
  }

  const { boardId, op } = (await req.json()) as { boardId?: string; op?: BoardOp };
  if (!boardId || !op) {
    return Response.json({ error: "boardId and op required" }, { status: 400 });
  }

  // The caller must be the owner or a collaborator on the board they're
  // broadcasting to — otherwise anyone with a session could spam every
  // board's SignalR group with fake ops.
  let board = await getBoard(uid, boardId);
  if (!board) board = await getBoardById(boardId);
  if (!board) return Response.json({ error: "Not found" }, { status: 404 });
  const canWrite = board.userId === uid || !!board.sharedWith?.includes(uid);
  if (!canWrite) return Response.json({ error: "Forbidden" }, { status: 403 });

  // Re-stamp the op's userId from the session wherever one is present, so a
  // client can't impersonate another collaborator in the broadcast payload.
  const stampedOp = stampUserId(op, uid);

  const { endpoint, key } = parseConnectionString(cs);
  const group = `board-${boardId}`;

  // Azure SignalR REST API: POST /api/v1/hubs/{hub}/groups/{group}
  const url = `${endpoint}/api/v1/hubs/${HUB}/groups/${encodeURIComponent(group)}`;
  const audience = url;
  const token = buildServerJwt(audience, key);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ target: "boardOp", arguments: [stampedOp] }),
  });

  if (!res.ok) {
    return Response.json({ error: "SignalR broadcast failed", status: res.status }, { status: 502 });
  }

  return new Response(null, { status: 204 });
}
