'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Locale } from './types';
import koJSON from './locales/ko.json';
import enJSON from './locales/en.json';

type TranslationMap = Record<string, string>;

function flattenObject(obj: Record<string, unknown>, prefix = ''): TranslationMap {
  const result: TranslationMap = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    }
  }
  return result;
}

const translations: Record<Locale, TranslationMap> = {
  ko: flattenObject(koJSON as Record<string, unknown>),
  en: flattenObject(enJSON as Record<string, unknown>),
};

export type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'preferred-lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ko') {
      setLocaleState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    document.title = translations[next]['meta.title'] ?? document.title;
  }, []);

  const t: TFunction = useCallback(
    (key, params) => {
      const value = translations[locale][key] ?? translations.ko[key] ?? key;
      if (!params) return value;
      return value.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
        params[k] !== undefined ? String(params[k]) : `{{${k}}}`
      );
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
