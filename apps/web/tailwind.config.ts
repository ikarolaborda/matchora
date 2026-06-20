import type { Config } from 'tailwindcss';
import { colors, space, radius, fontSize } from '@matchora/ui';

const px = (n: number) => `${n}px`;

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: colors.bg,
        surface: colors.surface,
        'surface-raised': colors.surfaceRaised,
        border: colors.border,
        text: colors.text,
        'text-muted': colors.textMuted,
        'text-faint': colors.textFaint,
        brand: colors.brand,
        'brand-dim': colors.brandDim,
        live: colors.live,
        'live-pulse': colors.livePulse,
        scheduled: colors.scheduled,
        finished: colors.finished,
        warn: colors.warn,
        qualified: colors.qualified,
        provisional: colors.provisional,
        possible: colors.possible,
        eliminated: colors.eliminated,
      },
      spacing: {
        xs: px(space.xs),
        sm: px(space.sm),
        md: px(space.md),
        lg: px(space.lg),
        xl: px(space.xl),
        xxl: px(space.xxl),
      },
      borderRadius: {
        sm: px(radius.sm),
        md: px(radius.md),
        lg: px(radius.lg),
        pill: px(radius.pill),
      },
      fontSize: {
        caption: px(fontSize.caption),
        body: px(fontSize.body),
        title: px(fontSize.title),
        score: px(fontSize.score),
        display: px(fontSize.display),
      },
    },
  },
  plugins: [],
};

export default config;
