/**
 * Persona types.
 *
 * NOTE: these are types only (erased at build time). The *values* that fill
 * `systemPrompt`, `conversationRules` and hidden `PersonaFact` content live in
 * `src/content/**\/personas.server.ts`, which is `server-only`. Never import a
 * persona definition into a client component — use `PublicPersona` instead.
 */

export type PersonaFactVisibility = 'public' | 'hidden';

export type PersonaFact = {
  id: string;
  /** Short client-safe label, e.g. "Morning sales velocity". */
  label: string;
  /** The actual fact. Hidden content must stay server-side until earned. */
  content: string;
  visibility: PersonaFactVisibility;
  /** Natural-language condition, also fed to the model in OpenAI mode. */
  disclosureRule: string;
  /** Deterministic fallback matcher used in mock mode and as a floor. */
  triggerTopics: string[];
};

export type PersonaDefinition = {
  key: string;
  name: string;
  role: string;
  organization: string;
  avatarColor: string;
  /** Client-safe framing the student is allowed to see. */
  visibleContext: string;
  /** First message the persona sends. Client-safe. */
  openingMessage: string;
  /** SERVER-ONLY. */
  systemPrompt: string;
  /** SERVER-ONLY. */
  conversationRules: string;
  facts: PersonaFact[];
  /** Which step keys this persona is reachable from. */
  stepKeys: string[];
  /**
   * What the persona is allowed to be told about the student's private work.
   * The QuickMart buyer must NOT see internal drafts — she only knows what the
   * student has actually said to her. The BITE manager legitimately sees them.
   */
  contextPolicy: { includeStudentWork: boolean };
  /** Office NPC placement so Phaser can position them. */
  officeZoneKey: string;
};
