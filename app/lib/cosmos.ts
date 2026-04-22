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
  /** Space this board is filed under (owner-scoped). Unset = uncategorized. */
  spaceId?: string;
};

// ---------------------------------------------------------------------------
// Space document — folders that group boards. Partitioned by owning userId.
// ---------------------------------------------------------------------------

export type SpaceIcon = "folder" | "flow" | "grid" | "user";

export type SpaceDoc = {
  id: string;
  userId: string;           // owner — partition key
  name: string;
  icon: SpaceIcon;
  createdAt: number;
  updatedAt: number;
};

// ---------------------------------------------------------------------------
// Team document — a named group of people who can be addressed together.
// Partitioned by owner so ownership lookups are cheap; member lists are
// embedded rather than joined so viewing a team is a single read.
// ---------------------------------------------------------------------------

export type TeamMember = {
  userId: string;           // Entra object id
  name: string;
  email: string;
  addedAt: number;
};

export type TeamDoc = {
  id: string;
  userId: string;           // owner (partition key)
  name: string;
  members: TeamMember[];
  createdAt: number;
  updatedAt: number;
};

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

type Container = ReturnType<ReturnType<CosmosClient["database"]>["container"]>;

let _client: CosmosClient | null = null;
let _boards: Container | null = null;
let _spaces: Container | null = null;
let _teams: Container | null = null;

function getClient(): CosmosClient {
  if (_client) return _client;
  const cs = process.env.COSMOS_CONNECTION_STRING;
  if (!cs) throw new Error("COSMOS_CONNECTION_STRING is not configured");
  _client = new CosmosClient(cs);
  return _client;
}

function getContainer(): Container {
  if (_boards) return _boards;
  _boards = getClient().database("aedas").container("boards");
  return _boards;
}

/**
 * Lazily ensures the `spaces` container exists. First call may take an extra
 * round-trip; subsequent calls return the cached handle. Partitioned by
 * `/userId` so all of an owner's spaces live in one partition.
 */
async function getSpacesContainer(): Promise<Container> {
  if (_spaces) return _spaces;
  const db = getClient().database("aedas");
  const { container } = await db.containers.createIfNotExists({
    id: "spaces",
    partitionKey: { paths: ["/userId"] },
  });
  _spaces = container;
  return _spaces;
}

async function getTeamsContainer(): Promise<Container> {
  if (_teams) return _teams;
  const db = getClient().database("aedas");
  const { container } = await db.containers.createIfNotExists({
    id: "teams",
    partitionKey: { paths: ["/userId"] },
  });
  _teams = container;
  return _teams;
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
      query: `SELECT c.id, c.userId, c.name, c.icon, c.createdAt, c.updatedAt,
                     c.sharedWith, c.spaceId, c.ownerName, c.ownerEmail
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

// ---------------------------------------------------------------------------
// Space helpers
// ---------------------------------------------------------------------------

export async function listSpaces(userId: string): Promise<SpaceDoc[]> {
  const c = await getSpacesContainer();
  const { resources } = await c
    .items.query<SpaceDoc>({
      query: "SELECT * FROM c WHERE c.userId = @uid",
      parameters: [{ name: "@uid", value: userId }],
    })
    .fetchAll();
  return resources.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getSpace(userId: string, spaceId: string): Promise<SpaceDoc | null> {
  const c = await getSpacesContainer();
  try {
    const { resource } = await c.item(spaceId, userId).read<SpaceDoc>();
    return resource ?? null;
  } catch {
    return null;
  }
}

export async function upsertSpace(doc: SpaceDoc): Promise<void> {
  const c = await getSpacesContainer();
  await c.items.upsert(doc);
}

export async function deleteSpaceDoc(userId: string, spaceId: string): Promise<void> {
  const c = await getSpacesContainer();
  try {
    await c.item(spaceId, userId).delete();
  } catch {
    // Already gone — no-op.
  }
}

// ---------------------------------------------------------------------------
// Team helpers
// ---------------------------------------------------------------------------

export async function listTeams(userId: string): Promise<TeamDoc[]> {
  const c = await getTeamsContainer();
  const { resources } = await c
    .items.query<TeamDoc>({
      query: "SELECT * FROM c WHERE c.userId = @uid",
      parameters: [{ name: "@uid", value: userId }],
    })
    .fetchAll();
  return resources.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getTeam(userId: string, teamId: string): Promise<TeamDoc | null> {
  const c = await getTeamsContainer();
  try {
    const { resource } = await c.item(teamId, userId).read<TeamDoc>();
    return resource ?? null;
  } catch {
    return null;
  }
}

export async function upsertTeam(doc: TeamDoc): Promise<void> {
  const c = await getTeamsContainer();
  await c.items.upsert(doc);
}

export async function deleteTeamDoc(userId: string, teamId: string): Promise<void> {
  const c = await getTeamsContainer();
  try {
    await c.item(teamId, userId).delete();
  } catch {
    /* Already gone — no-op. */
  }
}

/** Clear the spaceId on any of this user's boards that were filed under a
 *  space that's being deleted. Keeps boards around but uncategorized. */
export async function clearSpaceIdOnBoards(userId: string, spaceId: string): Promise<void> {
  const c = getContainer();
  const { resources } = await c
    .items.query<BoardDoc>({
      query: "SELECT * FROM c WHERE c.userId = @uid AND c.spaceId = @sid",
      parameters: [
        { name: "@uid", value: userId },
        { name: "@sid", value: spaceId },
      ],
    })
    .fetchAll();
  for (const b of resources) {
    const updated: BoardDoc = { ...b };
    delete updated.spaceId;
    await c.items.upsert(updated);
  }
}
