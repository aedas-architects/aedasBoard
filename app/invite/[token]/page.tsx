import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { acceptInvite } from "@/app/lib/cosmos";
import { Wordmark } from "@/app/components/wordmark";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  // Not logged in — send to login, then come back here after.
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/invite/${token}`);
  }

  const board = await acceptInvite(token, {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  });

  if (!board) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
        <div className="w-full max-w-sm rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-8 shadow-[var(--shadow-lg)] text-center">
          <Wordmark size={28} />
          <p className="mt-6 text-[15px] font-medium text-ink">Invite link expired</p>
          <p className="mt-2 text-[13px] text-muted">
            This link is no longer valid. Ask the board owner to send a new invite.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-[var(--r-xl)] bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0e0e0e]"
          >
            Go to your boards
          </a>
        </div>
      </main>
    );
  }

  // Accepted — redirect straight to the board.
  redirect(`/board/${board.id}`);
}
