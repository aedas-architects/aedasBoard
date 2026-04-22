// Server-only. Tiny in-memory token bucket per key.
// Limits reset when the App Service container restarts — acceptable for
// cost protection on low-traffic apps. If you scale out or want stronger
// guarantees, back this with Redis / Cosmos.

type Bucket = {
  tokens: number;
  lastRefill: number;
};

const BUCKETS = new Map<string, Bucket>();
const SWEEP_EVERY = 100; // every N calls, prune idle buckets
let _calls = 0;

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the next token is available when blocked. */
  retryAfter: number;
  /** Remaining tokens after this call. */
  remaining: number;
};

/**
 * Check + consume one token from the bucket identified by `key`.
 *   - capacity: max tokens (burst size)
 *   - refillPerMin: how many tokens are added per minute
 */
export function rateLimit(
  key: string,
  capacity: number,
  refillPerMin: number,
): RateLimitResult {
  const now = Date.now();
  const refillPerMs = refillPerMin / 60_000;

  let b = BUCKETS.get(key);
  if (!b) {
    b = { tokens: capacity, lastRefill: now };
    BUCKETS.set(key, b);
  } else {
    const elapsed = now - b.lastRefill;
    b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerMs);
    b.lastRefill = now;
  }

  // Opportunistic prune of buckets idle for >10 minutes.
  if (++_calls % SWEEP_EVERY === 0) {
    const cutoff = now - 10 * 60_000;
    for (const [k, v] of BUCKETS) if (v.lastRefill < cutoff) BUCKETS.delete(k);
  }

  if (b.tokens < 1) {
    const retryAfter = Math.ceil((1 - b.tokens) / refillPerMs / 1000);
    return { ok: false, retryAfter, remaining: 0 };
  }
  b.tokens -= 1;
  return { ok: true, retryAfter: 0, remaining: Math.floor(b.tokens) };
}

/** Build a standard 429 response for a failed rate-limit check. */
export function rateLimited(result: RateLimitResult): Response {
  return Response.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}
