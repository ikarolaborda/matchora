/**
 * @matchora/config — environment parsing, branding, and feature flags.
 *
 * Every external dependency is OPTIONAL: the app runs on the mock provider with
 * no DATABASE_URL, no REDIS_URL, and no provider keys. Server-only secrets are
 * never re-exported to client code; only the NEXT_PUBLIC_* branding subset is.
 */

import { z } from 'zod';

export const PROVIDERS = ['mock', 'sportmonks', 'api-football', 'sportradar'] as const;
export type ProviderName = (typeof PROVIDERS)[number];

const envSchema = z.object({
  FOOTBALL_DATA_PROVIDER: z.enum(PROVIDERS).default('mock'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  SPORTMONKS_API_KEY: z.string().optional(),
  API_FOOTBALL_KEY: z.string().optional(),
  API_FOOTBALL_LEAGUE_ID: z.coerce.number().int().default(1),
  API_FOOTBALL_SEASON: z.coerce.number().int().default(2026),
  SPORTRADAR_API_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('MatchOra'),
  NEXT_PUBLIC_TOURNAMENT_LABEL: z.string().default('World Football Tournament 2026'),
  NEXT_PUBLIC_DISCLAIMER: z
    .string()
    .default(
      'Independent live score application. Not affiliated with, endorsed by, or sponsored by FIFA or any tournament organizer.',
    ),
  NEXT_PUBLIC_API_BASE_URL: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

export interface ServerConfig {
  provider: ProviderName;
  databaseUrl: string | null;
  redisUrl: string | null;
  providerKeys: {
    sportmonks: string | null;
    apiFootball: string | null;
    sportradar: string | null;
  };
  apiFootball: {
    leagueId: number;
    season: number;
  };
  branding: Branding;
  features: FeatureFlags;
}

export interface Branding {
  appName: string;
  tournamentLabel: string;
  disclaimer: string;
  apiBaseUrl: string;
}

export interface FeatureFlags {
  liveSimulation: boolean;
  pushNotifications: boolean;
  liveActivities: boolean;
}

function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    // Be permissive: fall back to defaults rather than crash a local run.
    return envSchema.parse({});
  }
  return parsed.data;
}

/** Whether the selected provider has the credentials it needs (mock always ok). */
export function providerConfigured(env: Env): boolean {
  switch (env.FOOTBALL_DATA_PROVIDER) {
    case 'mock':
      return true;
    case 'sportmonks':
      return Boolean(env.SPORTMONKS_API_KEY);
    case 'api-football':
      return Boolean(env.API_FOOTBALL_KEY);
    case 'sportradar':
      return Boolean(env.SPORTRADAR_API_KEY);
    default:
      return false;
  }
}

/** Server-side config — includes secrets. Never send to the client. */
export function getServerConfig(source?: Record<string, string | undefined>): ServerConfig {
  const env = readEnv(source);
  // If a non-mock provider is selected without credentials, fall back to mock.
  const provider: ProviderName = providerConfigured(env) ? env.FOOTBALL_DATA_PROVIDER : 'mock';

  return {
    provider,
    databaseUrl: env.DATABASE_URL ?? null,
    redisUrl: env.REDIS_URL ?? null,
    providerKeys: {
      sportmonks: env.SPORTMONKS_API_KEY ?? null,
      apiFootball: env.API_FOOTBALL_KEY ?? null,
      sportradar: env.SPORTRADAR_API_KEY ?? null,
    },
    apiFootball: {
      leagueId: env.API_FOOTBALL_LEAGUE_ID,
      season: env.API_FOOTBALL_SEASON,
    },
    branding: getBranding(source),
    features: {
      liveSimulation: true,
      pushNotifications: true,
      liveActivities: true,
    },
  };
}

/** Public, client-safe branding subset. */
export function getBranding(source?: Record<string, string | undefined>): Branding {
  const env = readEnv(source);
  return {
    appName: env.NEXT_PUBLIC_APP_NAME,
    tournamentLabel: env.NEXT_PUBLIC_TOURNAMENT_LABEL,
    disclaimer: env.NEXT_PUBLIC_DISCLAIMER,
    apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL,
  };
}

export const APP_VERSION = '0.1.0';
