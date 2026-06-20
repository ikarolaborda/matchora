/**
 * Re-exports the shared design tokens for the mobile RN style system and adds
 * a couple of native-only conveniences (font weights typed for RN, hit slop).
 */
import { colors, space, radius, fontSize, typography } from '@matchora/ui';
import type { TextStyle } from 'react-native';

export { colors, space, radius, fontSize, typography };

/** RN-typed font weights (the shared tokens are plain strings). */
export const weight = {
  score: typography.scoreWeight as TextStyle['fontWeight'],
  title: typography.titleWeight as TextStyle['fontWeight'],
  body: typography.bodyWeight as TextStyle['fontWeight'],
};

/** Accessibility: expand small touch targets to the 44pt minimum. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

/** Minimum accessible touch target side length (Apple HIG / WCAG). */
export const MIN_TOUCH = 44;
