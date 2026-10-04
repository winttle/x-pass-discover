import 'server-only';
import type { PersonaDefinition } from '@/types/persona';
import type { PublicPersona } from '@/types/ai';
import { SALES_PERSONAS } from './sales/personas.server';

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
  };
}

export function listPublicPersonas(scenarioKey: string): PublicPersona[] {
  return listPersonas(scenarioKey).map(toPublicPersona);
}
