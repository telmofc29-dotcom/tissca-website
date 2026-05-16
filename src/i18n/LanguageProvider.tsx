/**
 * i18n/LanguageProvider.tsx — TISSCA language context + provider
 * ===============================================================
 * Client-side language switching with localStorage persistence.
 *
 * USAGE:
 *   Wrap in root layout: <LanguageProvider>{children}</LanguageProvider>
 *   In components: const { t, locale, setLocale } = useLanguage();
 *
 * PERSISTENCE:
 *   Stores selected locale in localStorage under 'tissca_locale'.
 *   Falls back to browser language detection → 'en'.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  translations,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
  type TranslationStrings,
} from './translations';

const STORAGE_KEY = 'tissca_locale';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationStrings;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: translations[DEFAULT_LOCALE],
});

/** Detect browser language and map to supported locale */
function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const lang = (navigator.language || '').toLowerCase().slice(0, 2);
  if (SUPPORTED_LOCALES.includes(lang as Locale)) return lang as Locale;
  return DEFAULT_LOCALE;
}

/** Read persisted locale from localStorage */
function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) return stored as Locale;
  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  // On mount: read stored locale or detect from browser
  useEffect(() => {
    const stored = getStoredLocale();
    const detected = stored ?? detectBrowserLocale();
    setLocaleState(detected);
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    // Update html lang attribute
    document.documentElement.lang = newLocale;
  }, []);

  // Sync html lang on mount
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  const t = translations[locale];

  // Memoize context value to prevent cascading re-renders on every parent render.
  // Without this, navigations and unrelated parent re-renders create a new context
  // value object, forcing ALL useLanguage() consumers to re-render unnecessarily.
  const contextValue = useMemo<LanguageContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Hook to access current translations and locale */
export function useLanguage() {
  return useContext(LanguageContext);
}
