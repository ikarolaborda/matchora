/**
 * Thin, Sentry-READY error tracking wrapper.
 *
 * Design constraints:
 * - ZERO hard dependency on `@sentry/nextjs`. It is imported dynamically and
 *   ONLY when `SENTRY_DSN` is set. A build/run without the package installed,
 *   or without a DSN configured, is a complete no-op (errors still hit the
 *   structured logger). This preserves the zero-infra mock default.
 * - Safe to call from any runtime (route handlers, server components, client
 *   error boundaries). The dynamic import is best-effort and never throws.
 *
 * To enable real error tracking later:
 *   1. add `@sentry/nextjs` to apps/web/package.json
 *   2. set the `SENTRY_DSN` env var (and optionally `SENTRY_ENVIRONMENT`)
 *   3. (optionally) add Sentry's instrumentation hooks for richer tracing
 */

import { logger, type LogFields } from './logger';

type MinimalSentry = {
  init?: (options: Record<string, unknown>) => void;
  captureException?: (err: unknown, context?: Record<string, unknown>) => void;
  captureMessage?: (message: string, context?: Record<string, unknown>) => void;
};

let sentryPromise: Promise<MinimalSentry | null> | null = null;

function sentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}

/**
 * Lazily resolve the Sentry SDK if (and only if) a DSN is configured and the
 * optional package is installed. Returns null otherwise. Never throws.
 */
async function loadSentry(): Promise<MinimalSentry | null> {
  if (!sentryEnabled()) {
    return null;
  }
  if (!sentryPromise) {
    sentryPromise = (async () => {
      try {
        // Use a computed specifier so bundlers don't try to resolve the
        // optional dependency at build time.
        const moduleName = '@sentry/nextjs';
        const mod = (await import(/* webpackIgnore: true */ moduleName)) as MinimalSentry;
        if (typeof mod.init === 'function') {
          mod.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
            tracesSampleRate: 0,
          });
        }
        return mod;
      } catch (err) {
        logger.warn('observability: SENTRY_DSN set but @sentry/nextjs unavailable', {
          error: String(err),
        });
        return null;
      }
    })();
  }
  return sentryPromise;
}

/**
 * Capture an error. Always logs via the structured logger; additionally
 * forwards to Sentry when enabled. Fire-and-forget — callers need not await.
 */
export function captureError(error: unknown, context?: LogFields): void {
  const message = error instanceof Error ? error.message : String(error);
  logger.error('captured_error', {
    error: message,
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });

  if (!sentryEnabled()) {
    return;
  }

  void loadSentry()
    .then((sentry) => {
      sentry?.captureException?.(error, context ? { extra: context } : undefined);
    })
    .catch(() => {
      // Never let observability failures surface to callers.
    });
}

/** Capture a non-exception message (e.g. a degraded-state warning). */
export function captureMessage(message: string, context?: LogFields): void {
  logger.warn(message, context);

  if (!sentryEnabled()) {
    return;
  }

  void loadSentry()
    .then((sentry) => {
      sentry?.captureMessage?.(message, context ? { extra: context } : undefined);
    })
    .catch(() => {
      // no-op
    });
}
