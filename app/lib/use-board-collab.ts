"use client";

import { useEffect, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { useBoard, type Item } from "./board-store";
import { usePresence, getPeerColor } from "./presence-store";

export type BoardOp =
  | { type: "item:add"; item: Item; userId: string }
  | { type: "item:update"; id: string; patch: Partial<Item>; userId: string }
  | { type: "item:remove"; id: string; userId: string }
  | { type: "cursor:move"; x: number; y: number; userId: string; userName: string }
  | { type: "user:join"; userId: string; userName: string }
  | { type: "user:leave"; userId: string };

const CURSOR_THROTTLE_MS = 50;

type Options = { boardId: string; userId: string; userName: string };

export function useBoardCollab({ boardId, userId, userName }: Options) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const lastCursorSentAt = useRef(0);
  const prevItemsRef = useRef<Item[]>([]);
  const { setPeer, setPeerCursor, removePeer } = usePresence();

  // Apply a remote op without touching undo history.
  const applyRemoteOp = useCallback((op: BoardOp) => {
    const store = useBoard.getState();
    switch (op.type) {
      case "item:add":
        if (!store.items.find((it) => it.id === (op as { type: "item:add"; item: Item }).item.id)) {
          useBoard.setState({ items: [...store.items, (op as { type: "item:add"; item: Item }).item] });
        }
        break;
      case "item:update":
        useBoard.setState({
          items: store.items.map((it) =>
            it.id === (op as { type: "item:update"; id: string; patch: Partial<Item> }).id
              ? ({ ...it, ...(op as { type: "item:update"; id: string; patch: Partial<Item> }).patch } as Item)
              : it
          ),
        });
        break;
      case "item:remove":
        useBoard.setState({ items: store.items.filter((it) => it.id !== (op as { type: "item:remove"; id: string }).id) });
        break;
      case "cursor:move":
        setPeerCursor((op as { type: "cursor:move"; userId: string; x: number; y: number }).userId,
          (op as { type: "cursor:move"; userId: string; x: number; y: number }).x,
          (op as { type: "cursor:move"; userId: string; x: number; y: number }).y);
        break;
      case "user:join":
        setPeer({ userId: (op as { type: "user:join"; userId: string; userName: string }).userId,
          userName: (op as { type: "user:join"; userId: string; userName: string }).userName,
          color: getPeerColor((op as { type: "user:join"; userId: string; userName: string }).userId), cursor: null });
        break;
      case "user:leave":
        removePeer((op as { type: "user:leave"; userId: string }).userId);
        break;
    }
  }, [setPeer, setPeerCursor, removePeer]);

  const broadcastOp = useCallback(async (op: BoardOp) => {
    try {
      await fetch("/api/signalr/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, op }),
      });
    } catch { /* non-fatal */ }
  }, [boardId]);

  const broadcastCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorSentAt.current < CURSOR_THROTTLE_MS) return;
    lastCursorSentAt.current = now;
    broadcastOp({ type: "cursor:move", x, y, userId, userName });
  }, [broadcastOp, userId, userName]);

  // Subscribe to item changes and broadcast diffs to peers.
  useEffect(() => {
    const unsub = useBoard.subscribe((curr, prev) => {
      if (curr.items === prev.items) return;

      const prevMap = new Map(prev.items.map((it) => [it.id, it]));
      const currMap = new Map(curr.items.map((it) => [it.id, it]));

      // Removed
      for (const [id] of prevMap) {
        if (!currMap.has(id)) {
          broadcastOp({ type: "item:remove", id, userId });
        }
      }
      // Added or updated
      for (const [id, item] of currMap) {
        if (!prevMap.has(id)) {
          broadcastOp({ type: "item:add", item, userId });
        } else if (prevMap.get(id) !== item) {
          broadcastOp({ type: "item:update", id, patch: item, userId });
        }
      }

      prevItemsRef.current = curr.items;
    });
    return unsub;
  }, [boardId, userId, broadcastOp]);

  // SignalR connection lifecycle.
  useEffect(() => {
    let cancelled = false;

    async function connect() {
      const res = await fetch("/api/signalr/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, boardId }),
      });
      if (!res.ok || cancelled) return;

      const { url, accessToken } = await res.json() as { url: string; accessToken: string };

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connection.on("boardOp", (op: BoardOp) => {
        if ("userId" in op && (op as { userId: string }).userId === userId) return;
        applyRemoteOp(op);
      });

      connection.onclose(() => { if (!cancelled) removePeer(userId); });

      await connection.start();
      if (cancelled) { connection.stop(); return; }

      connectionRef.current = connection;

      // Add this connection to the board group so it receives broadcasts.
      if (connection.connectionId) {
        await fetch("/api/signalr/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boardId, connectionId: connection.connectionId }),
        });
      }

      await broadcastOp({ type: "user:join", userId, userName });
    }

    connect().catch(() => { /* SignalR not configured — silent */ });

    return () => {
      cancelled = true;
      const conn = connectionRef.current;
      if (conn) {
        broadcastOp({ type: "user:leave", userId }).finally(() => conn.stop());
        connectionRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, userId]);

  return { broadcastOp, broadcastCursor };
}
