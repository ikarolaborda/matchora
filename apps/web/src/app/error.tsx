'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/observability';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: 'app/error.tsx', digest: error.digest });
  }, [error]);

  return (
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
  );
}
