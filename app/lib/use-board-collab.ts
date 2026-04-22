"use client";

import { useEffect, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { useBoard, type Item } from "./board-store";
import { usePresence, getPeerColor } from "./presence-store";
import { setBroadcastCursor, setBroadcastOp } from "./collab-bridge";
import { useChat, type ChatMessage } from "./chat-store";

export type BoardOp =
  | { type: "item:add"; item: Item; userId: string }
  | { type: "item:update"; id: string; patch: Partial<Item>; userId: string }
  | { type: "item:remove"; id: string; userId: string }
  | { type: "cursor:move"; x: number; y: number; userId: string; userName: string }
  // `reply` flags a handshake response so it isn't echoed again (prevents a ping-pong).
  | { type: "user:join"; userId: string; userName: string; reply?: boolean }
  | { type: "user:leave"; userId: string }
  | { type: "chat:message"; message: ChatMessage };

const CURSOR_THROTTLE_MS = 50;

type Options = { boardId: string; userId: string; userName: string; enabled?: boolean };

export function useBoardCollab({ boardId, userId, userName, enabled = true }: Options) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const lastCursorSentAt = useRef(0);
  const prevItemsRef = useRef<Item[]>([]);
  const applyingRemoteOp = useRef(false);
  // Ref to broadcastOp so applyRemoteOp can call it without a circular dep.
  const broadcastOpRef = useRef<((op: BoardOp) => void) | null>(null);
  const { setPeer, setPeerCursor, removePeer } = usePresence();

  // Apply a remote op without touching undo history.
  // Flag is set so the broadcast subscriber knows to skip re-broadcasting.
  const applyRemoteOp = useCallback((op: BoardOp) => {
    const store = useBoard.getState();
    applyingRemoteOp.current = true;
    try {
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
        case "user:join": {
          const join = op as { type: "user:join"; userId: string; userName: string; reply?: boolean };
          setPeer({
            userId: join.userId,
            userName: join.userName,
            color: getPeerColor(join.userId),
            cursor: null,
          });
          // Handshake: a non-reply join is someone new arriving, so echo our
          // own presence back so they can see us too. Reply joins aren't
          // echoed (prevents ping-pong).
          if (!join.reply) {
            broadcastOpRef.current?.({
              type: "user:join",
              userId,
              userName,
              reply: true,
            });
          }
          break;
        }
        case "user:leave":
          removePeer((op as { type: "user:leave"; userId: string }).userId);
          break;
        case "chat:message":
          useChat.getState().addMessage((op as { type: "chat:message"; message: ChatMessage }).message);
          break;
      }
    } finally {
      applyingRemoteOp.current = false;
    }
  }, [setPeer, setPeerCursor, removePeer, userId, userName]);

  const broadcastOp = useCallback(async (op: BoardOp) => {
    try {
      await fetch("/api/signalr/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, op }),
      });
    } catch { /* non-fatal */ }
  }, [boardId]);

  // Keep the ref pointed at the latest broadcastOp so applyRemoteOp's
  // handshake reply doesn't have to take it as a dep.
  broadcastOpRef.current = broadcastOp;

  const broadcastCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorSentAt.current < CURSOR_THROTTLE_MS) return;
    lastCursorSentAt.current = now;
    broadcastOp({ type: "cursor:move", x, y, userId, userName });
  }, [broadcastOp, userId, userName]);

  // Publish the cursor broadcaster to the collab bridge so the Canvas
  // (and anywhere else) can broadcast without prop-drilling.
  useEffect(() => {
    if (!enabled) return;
    setBroadcastCursor(broadcastCursor);
    return () => setBroadcastCursor(null);
  }, [enabled, broadcastCursor]);

  // Publish the generic op broadcaster so features like chat can send ops.
  useEffect(() => {
    if (!enabled) return;
    setBroadcastOp(broadcastOp);
    return () => setBroadcastOp(null);
  }, [enabled, broadcastOp]);

  // Subscribe to item changes and broadcast diffs to peers.
  useEffect(() => {
    if (!enabled) return;
    const unsub = useBoard.subscribe((curr, prev) => {
      if (curr.items === prev.items) return;
      // Skip re-broadcasting changes that came from a remote op — prevents echo loop.
      if (applyingRemoteOp.current) return;

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
  }, [boardId, userId, broadcastOp, enabled]);

  // SignalR connection lifecycle.
  useEffect(() => {
    if (!enabled) return;
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
        // Self-filter — we apply our own ops locally before broadcasting, so
        // we must ignore the echo from SignalR. Chat messages carry the
        // sender id nested inside `message.userId`; every other op has it
        // at the top level.
        const originUserId =
          op.type === "chat:message"
            ? op.message.userId
            : "userId" in op
              ? (op as { userId: string }).userId
              : undefined;
        if (originUserId === userId) return;
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
  }, [boardId, userId, enabled]);

  return { broadcastOp, broadcastCursor };
}
