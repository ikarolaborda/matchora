import { NextResponse } from 'next/server';
import { apiError } from '@matchora/shared';

/** JSON error response with the shared `apiError` shape. */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  return NextResponse.json(apiError(code, message, details), { status });
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
