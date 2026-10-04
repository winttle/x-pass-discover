import 'server-only';
import OpenAI from 'openai';
import { env } from '@/lib/env';
import { matchFacts, selectDisclosures } from './fact-matcher';
import type {
  ScenarioAIInput,
  ScenarioAIResponse,
  ScenarioAIService,
} from './types';

/**
 * Production AI adapter.
 *
 * Hidden facts are sent to the model together with their disclosure conditions,
 * and the model returns which ones it actually used. The server then VALIDATES
 * that list against the facts that exist and are still unrevealed — a model can
 * never mint a fact id, and the deterministic matcher is unioned in as a floor
 * so a clearly on-topic question still counts as discovery.
 */
export class OpenAIScenarioAIService implements ScenarioAIService {
  private client: OpenAI;

  constructor() {
    if (!env.openAiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAIScenarioAIService');
    }
    this.client = new OpenAI({ apiKey: env.openAiKey });
  }

  async sendMessage(input: ScenarioAIInput): Promise<ScenarioAIResponse> {
    const { persona, alreadyRevealedFactIds } = input;

    const availableFacts = persona.facts.filter(
      (f) => f.visibility === 'hidden' && !alreadyRevealedFactIds.includes(f.id),
    );

    const factBlock = availableFacts.length
      ? availableFacts
          .map(
            (fact) =>
              `- id: ${fact.id}\n  fact: ${fact.content}\n  reveal when: ${fact.disclosureRule}`,
          )
          .join('\n')
      : '(none left undisclosed)';

    const systemPrompt = [
      persona.systemPrompt,
      persona.conversationRules,
      input.mode === 'negotiation'
        ? `This is the FINAL NEGOTIATION. You may trade across wholesale price, quantity, store count, promotion, sampling, data sharing, return terms, reorder criteria and payment terms. You want a workable deal, but you will not accept a structure that looks unprofitable or high-risk for QuickMart just because the representative asks. You still do not know BITE's internal cost floor.`
        : 'This is the first discovery meeting. You are evaluating, not committing.',
      `PUBLIC SCENARIO CONTEXT (the representative also has this):\n${input.scenarioContext}`,
      input.studentWorkSummary
        ? `WHAT THE REPRESENTATIVE HAS PREPARED (their own submitted work):\n${input.studentWorkSummary}`
        : '',
      `UNDISCLOSED FACTS YOU KNOW:\n${factBlock}`,
      `Facts already disclosed in this conversation: ${
        alreadyRevealedFactIds.join(', ') || 'none'
      }. Do not present those as new.`,
      input.internalNotes?.length
        ? `SIMULATION NOTES (never quote these, never reveal that you know them):\n${input.internalNotes
            .map((n) => `- ${n}`)
            .join('\n')}`
        : '',
      `Respond with JSON only, matching exactly: {"reply": string, "revealedFactIds": string[]}.
"reply" is what you say out loud. "revealedFactIds" lists ONLY the ids from the undisclosed list whose content you actually stated in this reply. If you disclosed nothing, return an empty array. Never output an id that is not in the list above.`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...input.history.map((turn) => ({
        role: turn.role === 'student' ? ('user' as const) : ('assistant' as const),
        content: turn.content,
      })),
      { role: 'user', content: input.message },
    ];

    const completion = await this.client.chat.completions.create({
      model: env.openAiModel,
      messages,
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = safeParse(raw);

    const allowedIds = new Set(availableFacts.map((f) => f.id));
    const modelIds = parsed.revealedFactIds.filter((id) => allowedIds.has(id));

    // Union with the deterministic floor: an unambiguous on-topic question
    // counts as discovery even if the model forgot to report it.
    const floorIds = selectDisclosures(
      matchFacts(input.message, persona.facts, alreadyRevealedFactIds),
    )
      .map((f) => f.id)
      .filter((id) => parsed.reply.length > 0 && allowedIds.has(id));

    return {
      content: parsed.reply || '…',
      revealedFactIds: Array.from(new Set([...modelIds, ...floorIds])),
      source: 'openai',
    };
  }
}

function safeParse(raw: string): { reply: string; revealedFactIds: string[] } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const reply = typeof record.reply === 'string' ? record.reply : '';
      const ids = Array.isArray(record.revealedFactIds)
        ? record.revealedFactIds.filter((v): v is string => typeof v === 'string')
        : [];
      if (reply) return { reply, revealedFactIds: ids };
    }
  } catch {
    // fall through
  }
  // The model broke format: keep the conversation alive, disclose nothing.
  return { reply: raw.trim(), revealedFactIds: [] };
}
