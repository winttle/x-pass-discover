'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES, type Locale } from './config';
import { DICTIONARIES, translator, type Translate } from './translate';

const LocaleContext = createContext<Locale>('en');

/** Makes the server-resolved language available to client components. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

export function useT(): Translate {
  const locale = useLocale();
  return useMemo(() => translator(DICTIONARIES[locale]), [locale]);
}

/**
 * The language menu. The choice is stored in a cookie, so server-rendered
 * pages pick it up too, and the page re-renders in place.
 */
export function LanguageSwitcher({ className = '', tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  return (
    <label className={`relative inline-flex shrink-0 items-center ${className}`}>
      <span className="sr-only">{t('common.language')}</span>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className={`pointer-events-none absolute left-2 size-3.5 ${tone === 'dark' ? 'text-white/80' : 'text-muted'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <circle cx="10" cy="10" r="7.5" />
        <path d="M2.5 10h15M10 2.5c2.2 2.3 2.2 12.7 0 15M10 2.5c-2.2 2.3-2.2 12.7 0 15" />
      </svg>
      <select
        value={locale}
        data-testid="language-switcher"
        onChange={(event) => {
          document.cookie = `${LOCALE_COOKIE}=${event.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
        className={`cursor-pointer appearance-none rounded-lg border py-1.5 pl-7 pr-2.5 text-[11px] outline-none transition-colors ${
          tone === 'dark'
            ? 'border-white/20 bg-white/10 text-white hover:bg-white/20 [&>option]:text-strong'
            : 'border-line bg-surface text-body hover:border-line-strong hover:bg-sunken'
        }`}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_NAMES[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
