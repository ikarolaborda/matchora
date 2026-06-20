import type { ReactNode } from 'react';

export function SectionHeading({
  children,
  live = false,
  action,
}: {
  children: ReactNode;
  live?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="mb-md mt-lg flex items-center justify-between">
      <h2 className="flex items-center gap-sm text-title font-bold">
        {live ? (
          <span
            aria-hidden="true"
            className="live-pulse inline-block h-3 w-3 rounded-pill bg-live"
          />
        ) : null}
        {children}
      </h2>
      {action}
    </div>
  );
}
