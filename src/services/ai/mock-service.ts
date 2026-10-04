import type { PersonaFact } from '@/types/persona';
import { matchFacts, selectDisclosures } from './fact-matcher';
import type {
  ScenarioAIInput,
  ScenarioAIResponse,
  ScenarioAIService,
} from './types';

/**
 * Deterministic mock AI.
 *
 * Mock mode is not trying to sound human. It exists so the full scenario —
 * hidden-fact disclosure, follow-ups, the unexpected event and negotiation
 * state — is playable and testable with no OPENAI_API_KEY, behind exactly the
 * same interface as the production adapter.
 */

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(options: T[], seed: string): T {
  return options[hash(seed) % options.length];
}

const BUYER_PROBES = [
  'What are you basing that on? I need something stronger than a product claim before I give up a facing.',
  'I hear the product story. What I do not hear yet is what happens to my shelf if it does not sell.',
  'Help me understand the risk side. If this underperforms in week two, what happens?',
  'How is that different from what I already carry? FitDrink is cheaper and BodyGo has the same protein.',
  'That is a feature. Turn it into something that shows up in my category numbers.',
];

const NEGOTIATION_PROBES = [
  'That is closer. But price is not the only thing I am weighing — what are you doing about the sell-through risk?',
  'I can move on store count if you can move on something else. What are you willing to trade?',
  'If I take on the shelf risk, I need you to take on some of the inventory risk. What can you offer there?',
  'I am not going to decide on price alone. Show me what the first four weeks look like and how we measure it.',
  'Give me the specific terms. Region, stores, quantity, price, and what happens if it misses.',
];

const MANAGER_REPLIES = [
  'Good question — but that is the one you need to answer, not me. What does the account data already tell you?',
  'Before you decide that, ask yourself what QuickMart is actually trying to fix. The deal design follows from that.',
  'Check the guardrails before you commit to anything on price. If you go under the floor, we are not in business.',
  'Remember: a closed deal that loses money is worse than a lost pitch. What does the contribution look like in your structure?',
];

function renderDisclosure(facts: PersonaFact[]): string {
  return facts.map((fact) => fact.content).join(' ');
}

export class MockScenarioAIService implements ScenarioAIService {
  async sendMessage(input: ScenarioAIInput): Promise<ScenarioAIResponse> {
    const { persona, message, alreadyRevealedFactIds, mode } = input;

    const matches = matchFacts(message, persona.facts, alreadyRevealedFactIds);
    const disclosed = selectDisclosures(matches);
    const seed = `${persona.key}:${input.history.length}:${message}`;

    if (persona.key === 'bite-sales-manager') {
      const publicFact = persona.facts.find(
        (f) =>
          f.visibility === 'public' &&
          f.triggerTopics.some((t) => message.toLowerCase().includes(t)),
      );
      const body = publicFact
        ? `${publicFact.content} ${pick(MANAGER_REPLIES, seed)}`
        : pick(MANAGER_REPLIES, seed);
      return { content: body, revealedFactIds: [], source: 'mock' };
    }

    const probes = mode === 'negotiation' ? NEGOTIATION_PROBES : BUYER_PROBES;

    // A follow-up should visibly react to what was just said.
    const lastStudentTurn = [...input.history]
      .reverse()
      .find((t) => t.role === 'student');
    const continuity =
      lastStudentTurn && input.history.length > 1
        ? 'Coming back to what you said a moment ago — '
        : '';

    const guardrailNote = input.internalNotes?.length
      ? ' I am happy to keep talking, but I am not treating anything as agreed until the terms are concrete.'
      : '';

    if (disclosed.length > 0) {
      const content = `${renderDisclosure(disclosed)} ${pick(
        probes,
        seed,
      )}${guardrailNote}`;
      return {
        content: content.trim(),
        revealedFactIds: disclosed.map((f) => f.id),
        source: 'mock',
      };
    }

    const content = `${continuity}${pick(probes, seed)}${guardrailNote}`;
    return { content: content.trim(), revealedFactIds: [], source: 'mock' };
  }
}
