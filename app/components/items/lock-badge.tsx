"use client";

export function LockBadge({ zoom }: { zoom: number }) {
  return (
    <span
      className="pointer-events-none absolute flex items-center justify-center rounded-full bg-ink text-white shadow-[var(--shadow-sm)]"
      style={{
        width: 18 / zoom,
        height: 18 / zoom,
        top: -9 / zoom,
        right: -9 / zoom,
      }}
      aria-hidden
    >
      <svg
        width={11 / zoom}
        height={11 / zoom}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </span>
  );
}
