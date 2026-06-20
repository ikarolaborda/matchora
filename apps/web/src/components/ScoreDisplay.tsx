import type { ScorePair } from '@matchora/shared';

/**
 * Large, readable score typography. `homeText`/`awayText` accept strings so the
 * caller can pass a no-spoilers masked value (e.g. "—").
 */
export function ScoreDisplay({
  homeText,
  awayText,
  penalties,
  size = 'lg',
}: {
  homeText: string;
  awayText: string;
  penalties?: ScorePair | null;
  size?: 'md' | 'lg';
}) {
  const scoreClass = size === 'lg' ? 'text-score' : 'text-title';
  return (
    <div className="flex items-center gap-sm tabular-nums">
      <span className={`${scoreClass} font-extrabold leading-none`}>{homeText}</span>
      <span className="text-text-faint" aria-hidden="true">
        :
      </span>
      <span className={`${scoreClass} font-extrabold leading-none`}>{awayText}</span>
      {penalties ? (
        <span className="ml-sm text-caption text-text-muted">
          (pen {penalties.home}–{penalties.away})
        </span>
      ) : null}
    </div>
  );
}
