import { signIn } from "@/auth";
import { Wordmark } from "../components/wordmark";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      {/* Card */}
      <div className="w-full max-w-sm rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-8 shadow-[var(--shadow-lg)]">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Wordmark size={32} />
          <p className="text-center text-[13px] text-muted">
            Sign in to access your boards
          </p>
        </div>

        {/* Sign-in form — Server Action */}
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-[var(--r-xl)] border border-[var(--line)] bg-panel-soft px-4 py-3 text-[14px] font-medium text-ink shadow-[var(--shadow-sm)] transition-colors hover:bg-panel active:scale-[0.98]"
          >
            <MicrosoftLogo />
            Sign in with Microsoft
          </button>
        </form>

        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-muted">
          Access is restricted to Aedas organisation accounts.
          <br />
          Contact IT if you need help signing in.
        </p>
      </div>
    </main>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
