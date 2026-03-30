/**
 * Simple in-memory rate limiter for edge runtime.
 * Uses a sliding window counter per IP.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Max requests per window */
  maxRequests: number;
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 60_000, // 1 minute
  maxRequests: 20,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is within rate limits.
 * Returns result with remaining count and reset time.
 */
export function checkRateLimit(
  key: string,
  options: Partial<RateLimitOptions> = {},
): RateLimitResult {
  cleanup();

  const { windowMs, maxRequests } = { ...DEFAULT_OPTIONS, ...options };
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining, resetAt: entry.resetAt };
}

/**
 * Extract client identifier from request.
 * Uses IP address from headers or falls back to a generic key.
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Apply rate limiting to an API route. Returns a Response if rate limited, null otherwise.
 */
export function applyRateLimit(
  request: Request,
  options?: Partial<RateLimitOptions>,
): Response | null {
  const clientId = getClientIdentifier(request);
  const result = checkRateLimit(`api:${clientId}`, options);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  return null;
}
