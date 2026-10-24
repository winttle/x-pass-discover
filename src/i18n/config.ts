/**
 * Languages the interface can be shown in.
 *
 * English is the source language: every key exists in `messages/en.ts`, and
 * the other dictionaries are type-checked against it, so a missing
 * translation is a build error rather than a blank on screen.
 */
export const LOCALES = ['en', 'ja', 'ko'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** The chosen language, remembered for a year. */
export const LOCALE_COOKIE = 'xpass-locale';

/** Each language named in itself, for the switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
};

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
