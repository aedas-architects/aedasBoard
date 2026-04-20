export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-baseline font-serif italic leading-none tracking-tight text-ink select-none"
      style={{ fontSize: size }}
    >
      aedas
      <span
        className="text-accent not-italic font-sans"
        style={{
          fontSize: size * 1.2,
          lineHeight: 0,
          marginLeft: 1,
          transform: "translateY(1px)",
        }}
      >
        .
      </span>
    </span>
  );
}
