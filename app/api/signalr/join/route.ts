import { createHmac } from "crypto";
import { auth } from "@/auth";
import { getBoard, getBoardById } from "@/app/lib/cosmos";

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
  const sig = createHmac("sha256", key).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

// POST /api/signalr/join — add a connection to the board group
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;

  const cs = process.env.AZURE_SIGNALR_CONNECTION_STRING;
  if (!cs) return new Response(null, { status: 204 }); // SignalR not configured — silent

  const { boardId, connectionId } = (await req.json()) as { boardId?: string; connectionId?: string };
  if (!boardId || !connectionId) {
    return Response.json({ error: "boardId and connectionId required" }, { status: 400 });
  }

  // Only let the caller join SignalR groups for boards they can access.
  let board = await getBoard(uid, boardId);
  if (!board) board = await getBoardById(boardId);
  if (!board) return Response.json({ error: "Not found" }, { status: 404 });
  const canAccess = board.userId === uid || !!board.sharedWith?.includes(uid);
  if (!canAccess) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { endpoint, key } = parseConnectionString(cs);
  const group = `board-${boardId}`;

  // Azure SignalR REST API: PUT /api/v1/hubs/{hub}/groups/{group}/connections/{connectionId}
  const url = `${endpoint}/api/v1/hubs/${HUB}/groups/${encodeURIComponent(group)}/connections/${encodeURIComponent(connectionId)}`;
  const token = buildServerJwt(url, key);

  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    return Response.json({ error: "Failed to join group", status: res.status }, { status: 502 });
  }

  return new Response(null, { status: 204 });
}
