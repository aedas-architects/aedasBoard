import Link from "next/link";
import { Wordmark } from "./components/wordmark";

/**
 * Global 404 page — rendered by the App Router for any unmatched route.
 * Uses the same typography + palette as the rest of the app: serif italic
 * hero line, mono meta code, warm accent link.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col bg-bg">
      {/* Subtle grid texture — same recipe as the canvas background, dialed down */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--grid) 1px, transparent 1px), linear-gradient(to bottom, var(--grid) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse at center, #000 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, #000 0%, transparent 75%)",
        }}
      />

      {/* Wordmark, top-left */}
      <header className="relative z-10 px-8 pt-8">
        <Link href="/" aria-label="Home" className="inline-flex items-center gap-2.5">
          <Wordmark size={22} />
          {/* <span className="rounded-full bg-panel-soft px-2 py-[2px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted">
            Studio
          </span> */}
        </Link>
      </header>

      {/* Main content */}
      <section className="relative z-10 flex flex-1 items-center justify-center px-8 py-12">
        <div className="flex max-w-[560px] flex-col items-center text-center">
          {/* Status code — mono, muted, tracked out */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-panel px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted shadow-[var(--shadow-sm)]">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            404 · not found
          </div>

          {/* Serif italic hero */}
          <h1 className="font-serif text-[64px] leading-[0.95] italic text-ink sm:text-[88px]">
            A blank
            <br />
            <span className="text-muted">margin.</span>
          </h1>

          {/* Supporting copy */}
          <p className="mt-6 max-w-md text-[14px] leading-relaxed text-ink-soft">
            This page isn&apos;t where you left it. It may have moved, been deleted,
            or never existed in the first place.
          </p>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-[var(--r-2xl)] bg-ink px-4 py-2.5 text-[13px] font-semibold text-[var(--panel-soft)] shadow-[var(--shadow-md)] transition-colors hover:bg-[#0e0e0e]"
            >
              Back to boards
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel px-4 py-2.5 text-[13px] font-medium text-ink shadow-[var(--shadow-sm)] hover:bg-panel-soft"
            >
              Start a blank board
            </Link>
          </div>
        </div>
      </section>

      {/* Footer — quiet meta line */}
      <footer className="relative z-10 flex items-center justify-between px-8 pb-8 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
        <span>aedas · studio</span>
        <span>Error 404</span>
      </footer>
    </main>
  );
}
