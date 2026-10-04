import type { PersonaDefinition } from '@/types/persona';

export type AiTurn = { role: 'student' | 'persona'; content: string };

export type ScenarioAIInput = {
  persona: PersonaDefinition;
  /** Public scenario framing (mission, product, account). */
  scenarioContext: string;
  /** Summary of the student's own submitted work so far. */
  studentWorkSummary: string;
  history: AiTurn[];
  message: string;
  /** Facts this conversation has already surfaced. */
  alreadyRevealedFactIds: string[];
  /** `negotiation` unlocks deal-term trading behaviour. */
  mode: 'meeting' | 'negotiation';
  /**
   * SERVER-ONLY steering notes, e.g. "the proposed terms break a BITE
   * guardrail — do not treat this as a closed deal". Never sent to the client.
   */
  internalNotes?: string[];
};

export type ScenarioAIResponse = {
  content: string;
  /** Fact ids the reply actually disclosed. Validated server-side. */
  revealedFactIds: string[];
  /** Which adapter produced this, for the debug/admin view. */
  source: 'mock' | 'openai';
};

export interface ScenarioAIService {
  sendMessage(input: ScenarioAIInput): Promise<ScenarioAIResponse>;
}
