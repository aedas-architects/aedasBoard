"use client";

import { create } from "zustand";

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  color: string;
  text: string;
  at: number;
};

type ChatState = {
  messages: ChatMessage[];
  unread: number;
  open: boolean;
  addMessage: (msg: ChatMessage) => void;
  markRead: () => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  clear: () => void;
};

const MAX_MESSAGES = 500;

export const useChat = create<ChatState>((set, get) => ({
  messages: [],
  unread: 0,
  open: false,
  addMessage: (msg) =>
    set((s) => {
      const nextMessages =
        s.messages.length >= MAX_MESSAGES
          ? [...s.messages.slice(1), msg]
          : [...s.messages, msg];
      // Only increment unread if the panel is closed; if it's open the user is
      // actively looking at messages so they're effectively read.
      const unread = s.open ? 0 : s.unread + 1;
      return { messages: nextMessages, unread };
    }),
  markRead: () => set({ unread: 0 }),
  setOpen: (open) =>
    set((s) => ({ open, unread: open ? 0 : s.unread })),
  toggleOpen: () =>
    set((s) => ({ open: !s.open, unread: !s.open ? 0 : s.unread })),
  clear: () => set({ messages: [], unread: 0 }),
}));
