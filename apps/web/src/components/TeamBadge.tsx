import { emojiFlag } from '@matchora/ui';
import type { Team } from '@matchora/shared';

function initials(team: Team): string {
  if (team.code) {
    return team.code.slice(0, 3).toUpperCase();
  }
  return team.name.slice(0, 2).toUpperCase();
}

/**
 * Neutral team badge: token-colored placeholder with initials + an emoji flag.
 * No protected federation marks. `team` may be null for unresolved bracket slots.
 */
export function TeamBadge({
  team,
  size = 'md',
}: {
  team: Team | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-body' : 'h-8 w-8 text-caption';

  if (!team) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center rounded-md border border-border bg-surface-raised text-text-faint ${dim}`}
      >
        ?
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md font-bold ${dim}`}
      style={{
        backgroundColor: team.colorPrimary,
        color: team.colorSecondary,
        border: `1px solid ${team.colorSecondary}33`,
      }}
      role="img"
      aria-label={`${team.name} ${emojiFlag(team.countryCode)}`}
    >
      <span aria-hidden="true">{initials(team)}</span>
    </span>
  );
}
