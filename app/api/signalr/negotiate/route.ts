import { createHmac } from "crypto";

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
  const cs = process.env.AZURE_SIGNALR_CONNECTION_STRING;
  if (!cs) {
    return Response.json({ error: "AZURE_SIGNALR_CONNECTION_STRING not configured" }, { status: 503 });
  }

  const { userId, boardId } = await req.json() as { userId: string; boardId: string };
  if (!userId || !boardId) {
    return Response.json({ error: "userId and boardId required" }, { status: 400 });
  }

  const { endpoint, key } = parseConnectionString(cs);
  const clientUrl = `${endpoint}/client/?hub=${HUB}`;
  const accessToken = buildJwt(clientUrl, userId, key);

  return Response.json({ url: clientUrl, accessToken });
}
