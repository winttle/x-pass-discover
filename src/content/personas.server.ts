import 'server-only';
import type { Locale } from '@/i18n/config';
import type { PersonaDefinition } from '@/types/persona';
import type { PublicPersona } from '@/types/ai';
import type { Translations } from './localize';
import { SALES_PERSONAS } from './sales/personas.server';
import { SALES_PERSONA_TRANSLATIONS } from './sales/personas.i18n.server';

/**
 * SERVER-ONLY persona registry.
 *
 * Importing this from a client component is a build error. To render persona
 * information in the browser, pass `toPublicPersona(...)` instead — it strips
 * the system prompt, conversation rules and every hidden fact.
 */

const PERSONAS_BY_SCENARIO: Record<string, PersonaDefinition[]> = {
  'sales-quickmart': SALES_PERSONAS,
};

/**
 * What the student reads of a persona, in another language. The system prompt,
 * rules and fact content are not here: they are for the model, and the model
 * already answers in the student's language.
 */
export type PersonaText = {
  name?: string;
  role?: string;
  organization?: string;
  visibleContext?: string;
  openingMessage?: string;
  /** Fact label by fact id. */
  factLabels?: Record<string, string>;
};

export const PERSONA_TRANSLATIONS_BY_SCENARIO: Record<
  string,
  Translations<Record<string, PersonaText>>
> = {
  'sales-quickmart': SALES_PERSONA_TRANSLATIONS,
};

/** A persona with its client-facing text in the student's language. */
export function localizePersona(
  scenarioKey: string,
  persona: PersonaDefinition,
  locale: Locale,
): PersonaDefinition {
  const text =
    locale === 'en'
      ? undefined
      : PERSONA_TRANSLATIONS_BY_SCENARIO[scenarioKey]?.[locale]?.[persona.key];
  if (!text) return persona;
  return {
    ...persona,
    name: text.name ?? persona.name,
    role: text.role ?? persona.role,
    organization: text.organization ?? persona.organization,
    visibleContext: text.visibleContext ?? persona.visibleContext,
    openingMessage: text.openingMessage ?? persona.openingMessage,
    facts: persona.facts.map((fact) => ({
      ...fact,
      label: text.factLabels?.[fact.id] ?? fact.label,
    })),
  };
}

export function listPersonas(scenarioKey: string): PersonaDefinition[] {
  return PERSONAS_BY_SCENARIO[scenarioKey] ?? [];
}

export function getPersona(
  scenarioKey: string,
  personaKey: string,
): PersonaDefinition | null {
  return listPersonas(scenarioKey).find((p) => p.key === personaKey) ?? null;
}

/** The only shape of persona data allowed to cross to the client. */
export function toPublicPersona(persona: PersonaDefinition): PublicPersona {
  return {
    key: persona.key,
    name: persona.name,
    role: persona.role,
    organization: persona.organization,
    visibleContext: persona.visibleContext,
    avatarColor: persona.avatarColor,
    portrait: persona.portrait,
  };
}

export function listPublicPersonas(
  scenarioKey: string,
  locale: Locale = 'en',
): PublicPersona[] {
  return listPersonas(scenarioKey).map((persona) =>
    toPublicPersona(localizePersona(scenarioKey, persona, locale)),
  );
}
