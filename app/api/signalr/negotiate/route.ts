import { createHmac } from "crypto";
import { auth } from "@/auth";
import { getBoard, getBoardById } from "@/app/lib/cosmos";

export const runtime = "nodejs";

const HUB = "board";

// Parse "Endpoint=https://xxx;AccessKey=yyy;Version=1.0;" into parts.
function parseConnectionString(cs: string): { endpoint: string; key: string } {
  const endpoint = cs.match(/Endpoint=([^;]+)/)?.[1]?.replace(/\/$/, "");
  const key = cs.match(/AccessKey=([^;]+)/)?.[1];
  if (!endpoint || !key) throw new Error("Invalid AZURE_SIGNALR_CONNECTION_STRING");
  return { endpoint, key };
}

// Minimal HS256 JWT — no extra dependency needed.
function buildJwt(audience: string, userId: string, key: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ aud: audience, iat: now, exp: now + 3600, nameid: userId })
  ).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;

  const cs = process.env.AZURE_SIGNALR_CONNECTION_STRING;
  if (!cs) {
    return Response.json({ error: "AZURE_SIGNALR_CONNECTION_STRING not configured" }, { status: 503 });
  }

  const { boardId } = (await req.json()) as { boardId?: string };
  if (!boardId) {
    return Response.json({ error: "boardId required" }, { status: 400 });
  }

  // Verify the caller actually has access to the board they want to join.
  // Prevents negotiating a SignalR token scoped to a board you can't see.
  let board = await getBoard(uid, boardId);
  if (!board) board = await getBoardById(boardId);
  if (!board) return Response.json({ error: "Not found" }, { status: 404 });
  const canAccess = board.userId === uid || !!board.sharedWith?.includes(uid);
  if (!canAccess) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { endpoint, key } = parseConnectionString(cs);
  const clientUrl = `${endpoint}/client/?hub=${HUB}`;
  // Token's `nameid` is sourced from the session — callers cannot spoof an id.
  const accessToken = buildJwt(clientUrl, uid, key);

  return Response.json({ url: clientUrl, accessToken });
}
