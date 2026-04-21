import { create } from "zustand";

export type PeerCursor = {
  x: number;
  y: number;
};

export type Peer = {
  userId: string;
  userName: string;
  color: string;
  cursor: PeerCursor | null;
  lastSeen: number;
};

type PresenceState = {
  peers: Record<string, Peer>;
  setPeer: (peer: Omit<Peer, "lastSeen">) => void;
  setPeerCursor: (userId: string, x: number, y: number) => void;
  removePeer: (userId: string) => void;
};

// Stable colors assigned to peers by rotating through this palette.
const PEER_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
];

let _colorIndex = 0;
const _assignedColors = new Map<string, string>();

export function getPeerColor(userId: string): string {
  if (!_assignedColors.has(userId)) {
    _assignedColors.set(userId, PEER_COLORS[_colorIndex % PEER_COLORS.length]);
    _colorIndex++;
  }
  return _assignedColors.get(userId)!;
}

export const usePresence = create<PresenceState>((set, get) => ({
  peers: {},

  setPeer: (peer) =>
    set((s) => ({
      peers: {
        ...s.peers,
        [peer.userId]: {
          ...peer,
          cursor: s.peers[peer.userId]?.cursor ?? null,
          lastSeen: Date.now(),
        },
      },
    })),

  setPeerCursor: (userId, x, y) =>
    set((s) => {
      const existing = s.peers[userId];
      if (!existing) return s;
      return {
        peers: {
          ...s.peers,
          [userId]: { ...existing, cursor: { x, y }, lastSeen: Date.now() },
        },
      };
    }),

  removePeer: (userId) =>
    set((s) => {
      const next = { ...s.peers };
      delete next[userId];
      return { peers: next };
    }),
}));
