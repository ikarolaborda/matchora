'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/observability';

/**
 * Root error boundary. Catches errors thrown in the root layout itself (where
 * `app/error.tsx` cannot run). Must render its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: 'app/global-error.tsx', digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text antialiased">
        <div className="flex flex-col items-center gap-md py-xxl text-center" role="alert">
          <h1 className="text-title font-bold text-eliminated">⚠ Something went wrong</h1>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md border border-border px-md py-sm text-body hover:border-brand-dim"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
