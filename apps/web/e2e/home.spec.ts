import { test, expect } from '@playwright/test';

/**
 * Lightweight smoke: home renders, a live match is reachable, and the score
 * region on the detail page exposes an aria-live region for screen readers.
 */
test('home → live match → score region has aria-live', async ({ page }) => {
  await page.goto('/');

  // Home shows the app shell.
  await expect(page.getByRole('banner')).toBeVisible();

  // Navigate into the first available match card link.
  const firstMatch = page.getByTestId('match-card-link').first();
  await firstMatch.click();

  await page.waitForURL(/\/matches\//);

  // The score region must be an ARIA live region for live updates.
  const scoreRegion = page.getByTestId('score-region');
  await expect(scoreRegion).toBeVisible();
  await expect(scoreRegion).toHaveAttribute('aria-live', 'polite');
});
