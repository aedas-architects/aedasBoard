import { createHmac } from "crypto";
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

export async function POST(req: Request) {
  const cs = process.env.AZURE_SIGNALR_CONNECTION_STRING;
  if (!cs) {
    // No SignalR configured — silently succeed so local dev works without it.
    return new Response(null, { status: 204 });
  }

  const { boardId, op } = await req.json() as { boardId: string; op: BoardOp };
  if (!boardId || !op) {
    return Response.json({ error: "boardId and op required" }, { status: 400 });
  }

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
    body: JSON.stringify({ target: "boardOp", arguments: [op] }),
  });

  if (!res.ok) {
    return Response.json({ error: "SignalR broadcast failed", status: res.status }, { status: 502 });
  }

  return new Response(null, { status: 204 });
}
