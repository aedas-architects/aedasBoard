import { NextRequest, NextResponse } from "next/server";

/**
 * AI board generation — Azure OpenAI Foundry bridge.
 *
 * Env required (set in .env.local):
 *   AZURE_OPENAI_ENDPOINT       e.g. https://<resource>.openai.azure.com
 *   AZURE_OPENAI_API_KEY        Azure resource key
 *   AZURE_OPENAI_DEPLOYMENT     deployment id (chat model, eg. gpt-4o)
 *   AZURE_OPENAI_API_VERSION    e.g. 2024-10-21
 *
 * The request body is `{ prompt, anchor?, existingCount? }`. Response is
 * `{ items: Item[] }` — the AI emits items that conform directly to our board
 * file schema so the client can drop them straight into the store.
 */

const SYSTEM_PROMPT = `You generate content for Aedas Board, a Miro-style whiteboard. Output a JSON object with a single "items" array. Each item is a board element placed in world coordinates.

The complete item type is a discriminated union on "type". Every item also carries a unique "id" (string, you invent), "x", "y", "w", "h" (numbers, world units — pixels), and "rotation" (number, usually 0). Do not output any other top-level field besides "items".

Allowed item types and their extra fields:

1. "sticky" — sticky note. Required extras: "text" (string), "color" (CSS color or CSS var like "var(--sticky-canary)"; choose from var(--sticky-canary|peach|rose|sky|sage|lilac|stone|ink)), "textColor" (hex or var(--ink)). Sensible size ~220x220.

2. "text" — pure text label. Required extras: "text" (string), "fontSize" (number, default 20). Optional: "fontFamily" ("sans"|"serif"|"mono"), "fontWeight" (400-700), "align" ("left"|"center"|"right"), "autoSize" (boolean), "color" (CSS color).

3. "shape" — geometric shape. Required extras: "kind" (one of: "rectangle","rounded","oval","triangle","rhombus","pentagon","hexagon","octagon","star","arrow-right","arrow-left","double-arrow","parallelogram","trapezoid","cross","callout","cylinder","cloud","brace-left","brace-right"), "text" (string, may be empty), "fill" (CSS color, usually "#FFFFFF"), "stroke" (CSS color, usually "var(--ink)"). Sensible size 180x120 or 140x140.

4. "frame" — titled container. Required extras: "title" (string). Frames act as groups; put related items geometrically inside. Typical size 720x420.

5. "connector" — arrow/line between two items OR two world points. Required extras: "from" and "to", each either {"kind":"item","itemId":"<id>"} or {"kind":"point","x":number,"y":number}. Also "stroke" (CSS color), "strokeWidth" (number, usually 2), "arrowEnd" (boolean, usually true), "variant" ("line"|"arrow"|"elbow"|"block", usually "arrow"). For connectors, set x/y/w/h all to 0.

6. "comment" — comment pin. Extras: "thread" (array, usually []) and "resolved" (boolean, usually false). Size 36x36.

7. "stroke" — freehand drawing. Required extras: "points" (array of numbers, pairs of x,y relative to the item's top-left), "color" (hex), "strokeWidth" (number), "tool" ("pen"|"highlighter"). Avoid emitting strokes unless asked — shapes/text are usually better.

Design rules:
- Lay items out in a clean grid or flow. Leave ~24px gaps between sibling items.
- Use the anchor point the caller provides as the top-left of your layout (default 0,0).
- For diagrams / flowcharts use shapes + connectors. Keep labels concise.
- For kanban boards use a wide frame per column with sticky notes stacked vertically inside.
- For mind maps, place a central shape and connectors radiating out to leaf shapes/stickies.
- Prefer sticky notes for short ideas (≤40 chars each). Use text for titles. Use shapes for process steps.
- Always give connectors item-reference endpoints when connecting two items you just emitted — look up by id.
- Never emit overlapping items.

Output MUST be valid JSON that parses into { "items": Item[] }. No markdown, no prose, no trailing commentary.`;

type GenerateRequestBody = {
  prompt?: unknown;
  anchor?: unknown;
  existingCount?: unknown;
};

export async function POST(req: NextRequest) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";

  if (!endpoint || !apiKey || !deployment) {
    return NextResponse.json(
      {
        error:
          "Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY and AZURE_OPENAI_DEPLOYMENT in .env.local.",
      },
      { status: 500 },
    );
  }

  let body: GenerateRequestBody;
  try {
    body = (await req.json()) as GenerateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json(
      { error: "`prompt` is required." },
      { status: 400 },
    );
  }

  const anchor =
    body.anchor &&
    typeof body.anchor === "object" &&
    typeof (body.anchor as { x?: unknown }).x === "number" &&
    typeof (body.anchor as { y?: unknown }).y === "number"
      ? (body.anchor as { x: number; y: number })
      : { x: 0, y: 0 };

  const userMessage = `Anchor (top-left of the new content in world coordinates): ${anchor.x}, ${anchor.y}
Existing item count on the board: ${
    typeof body.existingCount === "number" ? body.existingCount : "unknown"
  }

Task:
${prompt}

Respond with JSON only.`;

  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(
    deployment,
  )}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  let azureResponse: Response;
  try {
    azureResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Azure request failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  if (!azureResponse.ok) {
    const detail = await azureResponse.text();
    return NextResponse.json(
      {
        error: `Azure OpenAI returned ${azureResponse.status}: ${detail.slice(0, 400)}`,
      },
      { status: 502 },
    );
  }

  type AzureChatResponse = {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const data = (await azureResponse.json()) as AzureChatResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "Azure response did not include any content." },
      { status: 502 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Model output was not valid JSON: ${(err as Error).message}`,
        raw: content,
      },
      { status: 502 },
    );
  }

  const items =
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { items?: unknown }).items)
      ? ((parsed as { items: unknown[] }).items as unknown[])
      : null;

  if (!items) {
    return NextResponse.json(
      { error: "Model output did not include an `items` array.", raw: parsed },
      { status: 502 },
    );
  }

  return NextResponse.json({ items });
}
