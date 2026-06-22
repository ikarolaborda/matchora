/**
 * Runtime backend-URL store.
 *
 * The mobile app talks to a deployment of the MatchOra web API whose URL is not
 * known at build time (e.g. an ngrok tunnel during development, a staging host,
 * or production). Rather than baking the URL into the bundle, we resolve it at
 * runtime: a build-time default (EXPO_PUBLIC_API_BASE_URL) seeds the value, the
 * user can override it from Settings, and the choice is persisted to
 * AsyncStorage so it survives restarts.
 *
 * This module is deliberately framework-agnostic (a plain module-level store +
 * listener Set) so non-React code — the HTTP client in src/api.ts and the SSE
 * URL builder in useLiveMatch — can read the current value synchronously. A
 * thin `useBackendUrl` hook is provided for React screens.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/** Persisted key for the user-configured backend URL. */
const STORAGE_KEY = 'matchora.backendUrl';

/**
 * The placeholder shipped in env defaults. When the effective default equals
 * this value we treat the backend as unconfigured (empty), forcing the user to
 * set a real URL in Settings before the app can fetch.
 */
export const PLACEHOLDER = 'https://api.matchora.example.com';

/** Strip a single trailing slash so URLs join cleanly with leading-slash paths. */
function normalize(url: string): string {
  return url.trim().replace(/\/$/, '');
}

/** Build-time default; the placeholder is treated as "unconfigured". */
const DEFAULT = (() => {
  const raw = normalize(process.env.EXPO_PUBLIC_API_BASE_URL ?? '');
  return raw === PLACEHOLDER ? '' : raw;
})();

let current = DEFAULT;

const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

/** The current effective backend base URL (no trailing slash), or '' if unset. */
export function getBackendUrl(): string {
  return current;
}

/** True once a non-empty backend URL is configured. */
export function isBackendConfigured(): boolean {
  return current !== '';
}

/**
 * Hydrate the stored backend URL (call once on app start). Any persisted value
 * overrides the build-time default. Failures are swallowed: we keep DEFAULT.
 */
export async function loadBackendUrl(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored != null) {
      current = normalize(stored);
      notify();
    }
  } catch {
    // AsyncStorage unavailable; fall back to the build-time default.
  }
}

/** Persist and apply a new backend URL, notifying subscribers. */
export async function setBackendUrl(url: string): Promise<void> {
  current = normalize(url);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, current);
  } catch {
    // Persistence failed; keep the in-memory value for this session.
  }
  notify();
}

/** Subscribe to backend-URL changes. Returns an unsubscribe function. */
export function subscribeBackendUrl(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** React binding: current URL, configured flag, and a `save` helper. */
export function useBackendUrl(): {
  url: string;
  configured: boolean;
  save: (u: string) => Promise<void>;
} {
  const [url, setUrl] = useState(getBackendUrl);

  useEffect(() => subscribeBackendUrl(() => setUrl(getBackendUrl())), []);

  return { url, configured: url !== '', save: setBackendUrl };
}
