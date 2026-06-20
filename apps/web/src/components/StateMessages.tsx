import type { ReactNode } from 'react';

export function EmptyState({ message, icon = '∅' }: { message: string; icon?: string }) {
  return (
    <div
      className="flex flex-col items-center gap-sm rounded-lg border border-dashed border-border bg-surface p-xl text-center"
      role="status"
    >
      <span aria-hidden="true" className="text-title text-text-faint">
        {icon}
      </span>
      <p className="text-body text-text-muted">{message}</p>
    </div>
  );
}

export function ErrorState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div
      className="flex flex-col items-center gap-sm rounded-lg border border-eliminated/40 bg-surface p-xl text-center"
      role="alert"
    >
      <span aria-hidden="true" className="text-title text-eliminated">
        ⚠
      </span>
      <p className="text-body text-text">{message}</p>
      {children}
    </div>
  );
}
