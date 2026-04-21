// Server-only — never import this from a client component.
import { CosmosClient } from "@azure/cosmos";
import type { Item } from "./board-store";
import type { BoardMeta } from "./boards-store";

// ---------------------------------------------------------------------------
// Document shapes
// ---------------------------------------------------------------------------

export type BoardMember = {
  userId: string;
  name: string;
  email: string;
  joinedAt: number;
};

export type BoardDoc = BoardMeta & {
  userId: string;           // owner — also the partition key
  ownerName?: string;       // owner's display name
  ownerEmail?: string;
  items: Item[];
  sharedWith?: string[];    // user IDs — for fast array_contains queries
  members?: BoardMember[];  // full member info for display
  inviteToken?: string;
  inviteExpiry?: number;
};

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _boards: ReturnType<ReturnType<CosmosClient["database"]>["container"]> | null = null;

function getContainer() {
  if (_boards) return _boards;
  const cs = process.env.COSMOS_CONNECTION_STRING;
  if (!cs) throw new Error("COSMOS_CONNECTION_STRING is not configured");
  const client = new CosmosClient(cs);
  _boards = client.database("aedas").container("boards");
  return _boards;
}

// ---------------------------------------------------------------------------
// Board helpers
// ---------------------------------------------------------------------------

export async function getBoard(userId: string, boardId: string): Promise<BoardDoc | null> {
  try {
    const { resource } = await getContainer().item(boardId, userId).read<BoardDoc>();
    return resource ?? null;
  } catch {
    return null;
  }
}

/** Find a board by ID regardless of owner — used when a collaborator opens a board. */
export async function getBoardById(boardId: string): Promise<BoardDoc | null> {
  try {
    const { resources } = await getContainer()
      .items.query<BoardDoc>({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: boardId }],
      })
      .fetchAll();
    return resources[0] ?? null;
  } catch {
    return null;
  }
}

export async function listBoards(userId: string): Promise<BoardDoc[]> {
  const { resources } = await getContainer()
    .items.query<BoardDoc>({
      query: `SELECT c.id, c.userId, c.name, c.icon, c.createdAt, c.updatedAt, c.sharedWith
              FROM c
              WHERE c.userId = @uid OR ARRAY_CONTAINS(c.sharedWith, @uid)`,
      parameters: [{ name: "@uid", value: userId }],
    })
    .fetchAll();
  return resources;
}

export async function upsertBoard(doc: BoardDoc): Promise<void> {
  await getContainer().items.upsert(doc);
}

export async function deleteBoard(userId: string, boardId: string): Promise<void> {
  await getContainer().item(boardId, userId).delete();
}

// ---------------------------------------------------------------------------
// Invite helpers
// ---------------------------------------------------------------------------

export async function generateInviteToken(ownerId: string, boardId: string): Promise<string> {
  const board = await getBoard(ownerId, boardId);
  if (!board) throw new Error("Board not found");

  const token = crypto.randomUUID();
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  await upsertBoard({ ...board, inviteToken: token, inviteExpiry: expiry });
  return token;
}

export async function revokeInviteToken(ownerId: string, boardId: string): Promise<void> {
  const board = await getBoard(ownerId, boardId);
  if (!board) return;
  const updated = { ...board };
  delete updated.inviteToken;
  delete updated.inviteExpiry;
  await upsertBoard(updated);
}

/** Validate token and add user to sharedWith + members. Returns the board on success. */
export async function acceptInvite(
  token: string,
  user: { id: string; name?: string | null; email?: string | null },
): Promise<BoardDoc | null> {
  const { resources } = await getContainer()
    .items.query<BoardDoc>({
      query: "SELECT * FROM c WHERE c.inviteToken = @token",
      parameters: [{ name: "@token", value: token }],
    })
    .fetchAll();

  const board = resources[0];
  if (!board) return null;
  if (board.inviteExpiry && board.inviteExpiry < Date.now()) return null;
  if (board.userId === user.id) return board; // owner doesn't need to join

  const alreadyMember = board.sharedWith?.includes(user.id);
  if (!alreadyMember) {
    const newMember: BoardMember = {
      userId: user.id,
      name: user.name ?? user.email ?? "Unknown",
      email: user.email ?? "",
      joinedAt: Date.now(),
    };
    await upsertBoard({
      ...board,
      sharedWith: [...(board.sharedWith ?? []), user.id],
      members: [...(board.members ?? []), newMember],
    });
  }
  return board;
}
