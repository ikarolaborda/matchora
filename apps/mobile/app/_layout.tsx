/**
 * Root layout: providers (React Query + Prefs), dark Stack, and a one-time
 * push-notification registration on mount.
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { colors } from '@/src/lib/theme';
import { PrefsProvider } from '@/src/lib/prefs';
import { registerForPushNotificationsAsync } from '@/src/lib/notifications';
import { loadBackendUrl, subscribeBackendUrl } from '@/src/lib/backend';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Live data: keep it fresh-ish; screens that need faster updates set
      // their own refetchInterval (e.g. the match detail poller).
      staleTime: 10_000,
    },
  },
});

/**
 * Hydrate the persisted backend URL once on start, then refetch everything when
 * it resolves or later changes (e.g. the user saves a new URL in Settings) so
 * every screen re-queries against the new base.
 */
function useBackendHydration() {
  useEffect(() => {
    let cancelled = false;
    void loadBackendUrl().then(() => {
      if (!cancelled) void queryClient.invalidateQueries();
    });
    const unsubscribe = subscribeBackendUrl(() => {
      // Switching backends is an environment switch, not a refresh: cancel
      // in-flight requests against the old host and drop its cached data
      // before refetching, so no stale cross-host data is ever shown.
      void queryClient.cancelQueries();
      queryClient.removeQueries();
      void queryClient.invalidateQueries();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
}

function useNotificationRegistration() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await registerForPushNotificationsAsync();
      if (cancelled) return;
      if (result.token) {
        // MVP: log the token. A real build POSTs it to the API to upsert a
        // DeviceToken row (see docs/PUSH_NOTIFICATIONS.md).
        console.log('[push] Expo push token:', result.token);
      } else {
        console.log('[push] not registered:', result.reason);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}

export default function RootLayout() {
  useBackendHydration();
  useNotificationRegistration();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PrefsProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { color: colors.text },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="match/[id]" options={{ title: 'Match', presentation: 'card' }} />
          </Stack>
        </PrefsProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
