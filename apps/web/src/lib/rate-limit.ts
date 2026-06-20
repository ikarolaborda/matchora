/**
 * In-memory sliding-window rate limiter.
 *
 * Intended for MUTATION / burst-prone routes only (POST ingest, POST simulate).
 * It is intentionally NOT applied to GET reads or the long-lived SSE stream.
 *
 * Pluggability: the storage is abstracted behind `RateLimitStore`. The default
 * is a process-local `Map` — correct for a single instance, best-effort across
 * a multi-instance deployment. To make limits cluster-correct, implement
 * `RateLimitStore` over Redis/Valkey (e.g. a sorted-set sliding window or an
 * atomic INCR+EXPIRE token bucket) and pass it via `checkRateLimit(req, opts,
 * store)`. The public signature does not change.
 */

export interface RateLimitOptions {
  /** Logical bucket name (e.g. 'ingest', 'simulate'). Namespaces the key. */
  key: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Unix epoch ms when the window resets (oldest hit + windowMs). */
  resetAt: number;
  /** Seconds to wait before retrying, when `ok` is false. */
  retryAfterSeconds: number;
}

/** Storage abstraction so a Redis/Valkey backend can be swapped in later. */
export interface RateLimitStore {
  /** Returns the hit timestamps (ms) currently recorded for a key. */
  get(key: string): number[] | undefined;
  /** Persists the (already-pruned) hit timestamps for a key. */
  set(key: string, hits: number[]): void;
}

/** Default single-process store backed by a Map. */
class MemoryStore implements RateLimitStore {
  private readonly buckets = new Map<string, number[]>();

  get(key: string): number[] | undefined {
    return this.buckets.get(key);
  }

  set(key: string, hits: number[]): void {
    if (hits.length === 0) {
      this.buckets.delete(key);
    } else {
      this.buckets.set(key, hits);
    }
  }
}

const defaultStore: RateLimitStore = new MemoryStore();

/**
 * Best-effort client identity. Prefers proxy-forwarded client IP, then the
 * platform-provided `request.ip` if present, falling back to a shared bucket.
 * Not auth — just coarse abuse mitigation.
 */
function clientId(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    // First hop is the originating client.
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

/**
 * Sliding-window check. Records the current hit when allowed. Pure-ish: the
 * only side effect is updating the store.
 */
export function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
  store: RateLimitStore = defaultStore,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  const bucketKey = `${options.key}:${clientId(request)}`;

  const existing = store.get(bucketKey) ?? [];
  // Drop hits that have aged out of the window.
  const recent = existing.filter((t) => t > windowStart);

  if (recent.length >= options.limit) {
    const oldest = recent[0] ?? now;
    const resetAt = oldest + options.windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
    // Persist the pruned window even on rejection so it keeps decaying.
    store.set(bucketKey, recent);
    return {
      ok: false,
      limit: options.limit,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    };
  }

  recent.push(now);
  store.set(bucketKey, recent);

  const oldest = recent[0] ?? now;
  return {
    ok: true,
    limit: options.limit,
    remaining: Math.max(0, options.limit - recent.length),
    resetAt: oldest + options.windowMs,
    retryAfterSeconds: 0,
  };
}
