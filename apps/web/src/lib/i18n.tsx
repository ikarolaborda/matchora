'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_LOCALE, makeTranslator, type Locale, type MessageKey } from '@matchora/shared';

type Translator = (key: MessageKey, vars?: Record<string, string | number>) => string;

interface LocaleContextValue {
  locale: Locale;
  t: Translator;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: makeTranslator(DEFAULT_LOCALE),
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: makeTranslator(locale) }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Read the active locale + translator. Default pt-BR. */
export function useI18n(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** Convenience hook returning just the translator. */
export function useT(): Translator {
  return useContext(LocaleContext).t;
}
