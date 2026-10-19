import type { Locale } from './config';
import { en, type MessageKey, type Messages } from './messages/en';
import { ja } from './messages/ja';
import { ko } from './messages/ko';

export const DICTIONARIES: Record<Locale, Messages> = { en, ja, ko };

export type Vars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: Vars) => string;

/** Fills `{name}` placeholders. Unknown placeholders are left as written. */
export function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function translator(messages: Messages): Translate {
  return (key, vars) => format(messages[key] ?? en[key] ?? key, vars);
}
