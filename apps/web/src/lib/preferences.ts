'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_LOCALE,
  type AlertType,
  type Id,
  type Locale,
  type QuietHours,
} from '@matchora/shared';

export const ALERT_TYPES: AlertType[] = [
  'match_start',
  'goal',
  'penalty',
  'red_card',
  'halftime',
  'fulltime',
  'group_table_changed',
  'lineup_available',
];

function defaultAlerts(): Record<AlertType, boolean> {
  return {
    match_start: true,
    goal: true,
    penalty: true,
    red_card: true,
    halftime: false,
    fulltime: true,
    group_table_changed: false,
    lineup_available: false,
  };
}

function defaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}

export interface PreferencesState {
  favoriteTeamIds: Id[];
  favoriteFixtureIds: Id[];
  locale: Locale;
  timeZone: string;
  noSpoilers: boolean;
  alerts: Record<AlertType, boolean>;
  quietHours: QuietHours;
  hydrated: boolean;

  toggleFavoriteTeam: (teamId: Id) => void;
  toggleFavoriteFixture: (fixtureId: Id) => void;
  isFavoriteTeam: (teamId: Id) => boolean;
  isFavoriteFixture: (fixtureId: Id) => boolean;
  setLocale: (locale: Locale) => void;
  setTimeZone: (tz: string) => void;
  setNoSpoilers: (value: boolean) => void;
  setAlert: (type: AlertType, value: boolean) => void;
  setQuietHours: (quietHours: Partial<QuietHours>) => void;
  setHydrated: () => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      favoriteTeamIds: [],
      favoriteFixtureIds: [],
      locale: DEFAULT_LOCALE,
      timeZone: defaultTimeZone(),
      noSpoilers: false,
      alerts: defaultAlerts(),
      quietHours: { enabled: false, start: '22:00', end: '07:00' },
      hydrated: false,

      toggleFavoriteTeam: (teamId) =>
        set((s) => ({
          favoriteTeamIds: s.favoriteTeamIds.includes(teamId)
            ? s.favoriteTeamIds.filter((id) => id !== teamId)
            : [...s.favoriteTeamIds, teamId],
        })),
      toggleFavoriteFixture: (fixtureId) =>
        set((s) => ({
          favoriteFixtureIds: s.favoriteFixtureIds.includes(fixtureId)
            ? s.favoriteFixtureIds.filter((id) => id !== fixtureId)
            : [...s.favoriteFixtureIds, fixtureId],
        })),
      isFavoriteTeam: (teamId) => get().favoriteTeamIds.includes(teamId),
      isFavoriteFixture: (fixtureId) => get().favoriteFixtureIds.includes(fixtureId),
      setLocale: (locale) => set({ locale }),
      setTimeZone: (timeZone) => set({ timeZone }),
      setNoSpoilers: (noSpoilers) => set({ noSpoilers }),
      setAlert: (type, value) => set((s) => ({ alerts: { ...s.alerts, [type]: value } })),
      setQuietHours: (quietHours) =>
        set((s) => ({ quietHours: { ...s.quietHours, ...quietHours } })),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'matchora-preferences',
      partialize: (s) => ({
        favoriteTeamIds: s.favoriteTeamIds,
        favoriteFixtureIds: s.favoriteFixtureIds,
        locale: s.locale,
        timeZone: s.timeZone,
        noSpoilers: s.noSpoilers,
        alerts: s.alerts,
        quietHours: s.quietHours,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
