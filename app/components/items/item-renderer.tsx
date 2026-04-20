"use client";

import { useMemo } from "react";
import { useBoard, type Item } from "../../lib/board-store";
import { CommentPin } from "./comment-pin";
import { Connector } from "./connector";
import { FrameBox } from "./frame-box";
import { ImageView } from "./image";
import { Shape } from "./shape";
import { Sticky } from "./sticky";
import { Stroke } from "./stroke";
import { TextWidget } from "./text-widget";

export function ItemRenderer({ item }: { item: Item }) {
  const selected = useBoard((s) => s.selectedIds.includes(item.id));

  switch (item.type) {
    case "sticky":
      return <Sticky item={item} selected={selected} />;
    case "shape":
      return <Shape item={item} selected={selected} />;
    case "text":
      return <TextWidget item={item} selected={selected} />;
    case "frame":
      return <FrameBox item={item} selected={selected} />;
    case "stroke":
      return <Stroke item={item} selected={selected} />;
    case "connector":
      return <Connector item={item} selected={selected} />;
    case "comment":
      return <CommentPin item={item} selected={selected} />;
    case "image":
      return <ImageView item={item} selected={selected} />;
  }
}

/**
 * Frames render below everything; connectors render above stickies but below
 * comments (so comment pins always float on top).
 */
export function useSortedItems() {
  const items = useBoard((s) => s.items);
  return useMemo(() => {
    const frames = items.filter((i) => i.type === "frame");
    const connectors = items.filter((i) => i.type === "connector");
    const comments = items.filter((i) => i.type === "comment");
    const rest = items.filter(
      (i) =>
        i.type !== "frame" && i.type !== "connector" && i.type !== "comment",
    );
    return [...frames, ...connectors, ...rest, ...comments];
  }, [items]);
}
