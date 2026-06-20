import { NextResponse } from 'next/server';
import { apiError } from '@matchora/shared';
import type { RateLimitResult } from '@/lib/rate-limit';

/** JSON error response with the shared `apiError` shape. */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  return NextResponse.json(apiError(code, message, details), { status });
}

/**
 * 429 response with the shared `apiError` shape plus `Retry-After` and
 * standard `RateLimit-*` informational headers.
 */
export function rateLimitedResponse(result: RateLimitResult): NextResponse {
  const res = NextResponse.json(
    apiError('rate_limited', 'Too many requests — please slow down', {
      retryAfterSeconds: result.retryAfterSeconds,
    }),
    { status: 429 },
  );
  res.headers.set('Retry-After', String(result.retryAfterSeconds));
  res.headers.set('RateLimit-Limit', String(result.limit));
  res.headers.set('RateLimit-Remaining', String(result.remaining));
  res.headers.set('RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

/** JSON success response with optional cache headers. */
export function jsonResponse<T>(
  data: T,
  init?: { status?: number; cacheSeconds?: number },
): NextResponse {
  const headers = new Headers();
  if (init?.cacheSeconds && init.cacheSeconds > 0) {
    headers.set(
      'Cache-Control',
      `public, max-age=0, s-maxage=${init.cacheSeconds}, stale-while-revalidate=${init.cacheSeconds * 2}`,
    );
  } else {
    headers.set('Cache-Control', 'no-store');
  }
  return NextResponse.json(data, { status: init?.status ?? 200, headers });
}
