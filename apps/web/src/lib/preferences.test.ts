import { describe, it, expect, beforeEach } from 'vitest';
import { usePreferences, ALERT_TYPES } from './preferences';

// localStorage shim for the persist middleware under the node environment.
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  usePreferences.setState({ favoriteTeamIds: [], favoriteFixtureIds: [], noSpoilers: false });
});

describe('preferences store', () => {
  it('covers every AlertType with a default', () => {
    const { alerts } = usePreferences.getState();
    for (const type of ALERT_TYPES) {
      expect(typeof alerts[type]).toBe('boolean');
    }
  });

  it('toggles a favorite team idempotently', () => {
    const { toggleFavoriteTeam } = usePreferences.getState();
    toggleFavoriteTeam('team-1');
    expect(usePreferences.getState().favoriteTeamIds).toEqual(['team-1']);
    toggleFavoriteTeam('team-1');
    expect(usePreferences.getState().favoriteTeamIds).toEqual([]);
  });

  it('toggles no-spoilers', () => {
    usePreferences.getState().setNoSpoilers(true);
    expect(usePreferences.getState().noSpoilers).toBe(true);
  });
});
