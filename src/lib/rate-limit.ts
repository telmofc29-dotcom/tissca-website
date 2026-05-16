// src/lib/rate-limit.ts
//
// Simple in-memory sliding-window rate limiter.
// Suitable for Vercel Serverless Functions (works within a single instance).
// For multi-instance deployments, swap to Redis/Upstash when needed.
//
// Usage in API routes:
//   import { rateLimit, getClientIp } from '@/lib/rate-limit';
//   const limiter = rateLimit({ interval: 60_000, limit: 5 });
//   const ip = getClientIp(request);
//   if (!limiter.check(ip)) return NextResponse.json({ error: '...' }, { status: 429 });

interface RateLimitOptions {
  /** Window size in milliseconds (default: 60 000 = 1 min) */
  interval?: number;
  /** Max requests per window per key (default: 5) */
  limit?: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

export function rateLimit(opts: RateLimitOptions = {}) {
  const interval = opts.interval ?? 60_000;
  const limit = opts.limit ?? 5;
  const store = new Map<string, Entry>();

  // Periodically purge expired entries to prevent memory leaks
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  };

  // Cleanup every 5 minutes
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, 5 * 60_000);
  }

  return {
    /**
     * Check whether the given key is within the rate limit.
     * Returns `true` if allowed, `false` if rate-limited.
     */
    check(key: string): boolean {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + interval });
        return true;
      }

      entry.count += 1;
      return entry.count <= limit;
    },

    /**
     * Returns remaining requests for the key, or the limit if no entry exists.
     */
    remaining(key: string): number {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || entry.resetAt <= now) return limit;
      return Math.max(0, limit - entry.count);
    },
  };
}

/**
 * Extract the client IP from a Next.js request.
 * Prefers x-forwarded-for (Vercel, Cloudflare) → falls back to x-real-ip → 'unknown'.
 */
export function getClientIp(request: { headers: Headers } | { headers: { get(name: string): string | null } }): string {
  const headers = request.headers;
  const xff = typeof headers.get === 'function' ? headers.get('x-forwarded-for') : null;
  if (xff) return xff.split(',')[0].trim();
  const xri = typeof headers.get === 'function' ? headers.get('x-real-ip') : null;
  if (xri) return xri;
  return 'unknown';
}
