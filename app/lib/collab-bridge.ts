"use client";

import type { BoardOp } from "./use-board-collab";

/**
 * Module-level bridge so components (Canvas, ChatPanel, ...) can broadcast
 * collab ops without prop-drilling through the tree. `useBoardCollab` sets
 * these on connect and clears them on disconnect.
 */

type CursorFn = (x: number, y: number) => void;
type OpFn = (op: BoardOp) => void;

let _broadcastCursor: CursorFn | null = null;
let _broadcastOp: OpFn | null = null;

export function setBroadcastCursor(fn: CursorFn | null) {
  _broadcastCursor = fn;
}

export function setBroadcastOp(fn: OpFn | null) {
  _broadcastOp = fn;
}

export function broadcastCursor(x: number, y: number) {
  _broadcastCursor?.(x, y);
}

export function broadcastOp(op: BoardOp) {
  _broadcastOp?.(op);
}

/** True when we're connected to collab (something has registered a broadcaster). */
export function isCollabConnected() {
  return _broadcastOp !== null;
}
