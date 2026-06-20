/**
 * MatchOra design tokens — dark-first, high-contrast, original identity.
 * Shared by web (Tailwind theme) and mobile (RN style system).
 */

export const colors = {
  // surfaces
  bg: '#0a0e14',
  surface: '#121821',
  surfaceRaised: '#1a2230',
  border: '#26303f',
  // text
  text: '#eef2f7',
  textMuted: '#9aa7b8',
  textFaint: '#5d6b7d',
  // brand
  brand: '#22e3a3', // MatchOra accent (mint-green pitch)
  brandDim: '#13a679',
  // status (paired with icons/labels — never color-only)
  live: '#ff3d57',
  livePulse: '#ff6b7e',
  scheduled: '#9aa7b8',
  finished: '#7a8aa0',
  warn: '#ffb020',
  // qualification states
  qualified: '#22e3a3',
  provisional: '#5bc0ff',
  possible: '#ffb020',
  eliminated: '#ff3d57',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  body: 14,
  title: 18,
  score: 34,
  display: 48,
} as const;

export const typography = {
  scoreWeight: '800',
  titleWeight: '700',
  bodyWeight: '400',
} as const;

/** Status → display intent. UI must also render an icon/label, not color alone. */
export const statusIntent: Record<string, { color: string; pulse: boolean }> = {
  scheduled: { color: colors.scheduled, pulse: false },
  live: { color: colors.live, pulse: true },
  halftime: { color: colors.warn, pulse: true },
  extra_time: { color: colors.live, pulse: true },
  penalties: { color: colors.live, pulse: true },
  finished: { color: colors.finished, pulse: false },
  postponed: { color: colors.textFaint, pulse: false },
  cancelled: { color: colors.textFaint, pulse: false },
};

export const qualificationColor: Record<string, string> = {
  qualified: colors.qualified,
  provisionally_qualified: colors.provisional,
  still_possible: colors.possible,
  eliminated: colors.eliminated,
  unknown: colors.textFaint,
};

/** Emoji flag from an ISO 3166-1 alpha-2 country code (safe, no protected art). */
export function emojiFlag(countryCode: string): string {
  if (!/^[A-Za-z]{2}$/.test(countryCode)) {
    return '🏳️';
  }
  const base = 0x1f1e6;
  const cc = countryCode.toUpperCase();
  return String.fromCodePoint(base + (cc.charCodeAt(0) - 65), base + (cc.charCodeAt(1) - 65));
}
