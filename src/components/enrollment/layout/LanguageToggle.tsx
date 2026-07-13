'use client';

import { useLanguage } from '@/lib/enrollment/i18n/LanguageContext';

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <button
        onClick={() => setLocale('ko')}
        className={`px-2 py-1 rounded transition-colors ${
          locale === 'ko' ? 'text-white bg-white/10' : 'text-white/40 hover:text-white/60'
        }`}
      >
        KO
      </button>
      <span className="text-white/20">|</span>
      <button
        onClick={() => setLocale('en')}
        className={`px-2 py-1 rounded transition-colors ${
          locale === 'en' ? 'text-white bg-white/10' : 'text-white/40 hover:text-white/60'
        }`}
      >
        EN
      </button>
    </div>
  );
}
