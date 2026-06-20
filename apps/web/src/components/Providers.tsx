'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocaleProvider } from '@/lib/i18n';
import { usePreferences } from '@/lib/preferences';
import { DEFAULT_LOCALE } from '@matchora/shared';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  // Locale comes from persisted preferences once hydrated; default until then.
  const locale = usePreferences((s) => s.locale);
  const hydrated = usePreferences((s) => s.hydrated);

  // Keep <html lang> in sync with the active locale.
  useEffect(() => {
    if (hydrated && typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale, hydrated]);

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider locale={hydrated ? locale : DEFAULT_LOCALE}>{children}</LocaleProvider>
    </QueryClientProvider>
  );
}
