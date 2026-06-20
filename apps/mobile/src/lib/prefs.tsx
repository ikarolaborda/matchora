/**
 * Lightweight in-memory user preferences for the MVP (no persistence yet).
 *
 * Holds the client-side slice of UserPreferences that the UI needs right now:
 * no-spoilers toggle, favorite fixture ids, locale and time zone. A real build
 * would hydrate this from the server (UserPreferences) and persist locally.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, type Locale } from '@matchora/shared';

interface PrefsState {
  noSpoilers: boolean;
  favoriteFixtureIds: string[];
  locale: Locale;
  timeZone: string;
}

interface PrefsContextValue extends PrefsState {
  setNoSpoilers: (v: boolean) => void;
  toggleFavorite: (fixtureId: string) => void;
  isFavorite: (fixtureId: string) => boolean;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [noSpoilers, setNoSpoilers] = useState(false);
  const [favoriteFixtureIds, setFavoriteFixtureIds] = useState<string[]>([]);

  const toggleFavorite = useCallback((fixtureId: string) => {
    setFavoriteFixtureIds((prev) =>
      prev.includes(fixtureId) ? prev.filter((id) => id !== fixtureId) : [...prev, fixtureId],
    );
  }, []);

  const isFavorite = useCallback(
    (fixtureId: string) => favoriteFixtureIds.includes(fixtureId),
    [favoriteFixtureIds],
  );

  const value = useMemo<PrefsContextValue>(
    () => ({
      noSpoilers,
      favoriteFixtureIds,
      // Device time zone; falls back to UTC if unavailable.
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
      locale: DEFAULT_LOCALE,
      setNoSpoilers,
      toggleFavorite,
      isFavorite,
    }),
    [noSpoilers, favoriteFixtureIds, toggleFavorite, isFavorite],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used within a PrefsProvider');
  return ctx;
}
