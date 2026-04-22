"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { BoardSearch } from "../../components/board-search";
import { Canvas } from "../../components/canvas";
import { ChatPanel } from "../../components/chat-panel";
import { CommandPalette } from "../../components/command-palette";
import { CreationToolbar } from "../../components/creation-toolbar";
import { ExportModal } from "../../components/export-modal";
import { FramesPanel } from "../../components/frames-panel";
import { Minimap } from "../../components/minimap";
import { NavBar } from "../../components/nav-bar";
import { PresentationMode } from "../../components/presentation-mode";
import { ShortcutsSheet } from "../../components/shortcuts-sheet";
import { TemplatesModal } from "../../components/templates-modal";
import { HistoryPanel } from "../../components/history-panel";
import { TopBar } from "../../components/top-bar";
import { UndoRedo } from "../../components/undo-redo";
import { useBoardPersistence } from "../../lib/board-persistence";
import { useBoards } from "../../lib/boards-store";
import { useBoardCollab } from "../../lib/use-board-collab";
import { useUI } from "../../lib/ui-store";

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const hydrated = useBoards((s) => s.hydrated);
  const board = useBoards((s) => s.boards.find((b) => b.id === id));

  useBoardPersistence(id);

  useEffect(() => {
    if (hydrated && !board) {
      router.replace("/");
    }
  }, [hydrated, board, router]);

  if (!hydrated) {
    return <main className="relative h-screen w-screen bg-bg" />;
  }
  if (!board) return null;

  return <BoardLayout id={id} />;
}

function BoardLayout({ id }: { id: string }) {
  const presenting = useUI((s) => s.presenting);
  const { data: session } = useSession();
  const board = useBoards((s) => s.boards.find((b) => b.id === id));

  // Only establish a SignalR connection when collab is actually needed —
  // the board has been shared with someone, or the current user isn't the owner.
  const uid = session?.user?.id ?? "anonymous";
  const collabEnabled = Boolean(
    (board?.sharedWith && board.sharedWith.length > 0) ||
    (board?.userId && board.userId !== uid)
  );

  useBoardCollab({
    boardId: id,
    userId: uid,
    userName: session?.user?.name ?? session?.user?.email ?? "Anonymous",
    enabled: collabEnabled,
  });

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg">
      <Canvas />
      {!presenting && (
        <>
          <TopBar boardId={id} />
          <CreationToolbar />
          <UndoRedo />
          <Minimap />
          <NavBar />
          <FramesPanel />
          <HistoryPanel />
          <BoardSearch />
          <ChatPanel />
        </>
      )}
      <CommandPalette />
      <TemplatesModal />
      <ShortcutsSheet />
      <ExportModal boardId={id} />
      <PresentationMode />
    </main>
  );
}
