import 'server-only';
import { getRepository } from '@/db/repository';
import { getPersona } from '@/content/personas.server';
import { findTask, getStep } from '@/content/registry';
import { BITE_PROTEIN_DRINK } from '@/content/company';
import { logEvent } from '@/services/events';
import { evaluateGuardrails, hasViolations } from '@/services/scenario/guardrails';
import {
  getScenarioForSession,
  loadEngineState,
  syncProgress,
} from '@/services/scenario/session-service';
import type { PersonaDefinition } from '@/types/persona';
import type { ConversationView } from '@/types/ai';
import type { AiMessage, ProjectSession } from '@/types/runtime';
import { getScenarioAIService } from './index';
import type { AiTurn } from './types';

/**
 * Conversation orchestration.
 *
 * Everything that decides *what the AI knows* lives here, on the server. The
 * client receives messages and the labels of facts it has earned — never the
 * hidden fact set, the system prompt, or the disclosure rules.
 */

const MAX_HISTORY_TURNS = 24;

function publicScenarioContext(): string {
  const a = BITE_PROTEIN_DRINK.attributes;
  return [
    `Product: ${BITE_PROTEIN_DRINK.name} — ${a.size}, ${a.protein} protein, ${a.calories}, refrigerated, ${a.shelfLifeDays}-day shelf life, flavors ${a.flavors.join(' and ')}.`,
    `Recommended retail price ¥${a.recommendedRetailPriceYen}; standard QuickMart wholesale ¥${a.standardWholesalePriceYen}; pack size ${a.packSize}.`,
    `BITE is a casual F&B brand. The product has low brand awareness in Japan and limited initial production capacity.`,
    `Competing products on the shelf: FitDrink (300 ml / 15 g, retail ¥278), BodyGo (350 ml / 20 g, retail ¥328), Morning Plus (250 ml / 10 g, retail ¥248).`,
  ].join('\n');
}

/** Only used for personas whose `contextPolicy` allows it. */
async function buildStudentWorkSummary(sessionId: string): Promise<string> {
  const answers = await getRepository().listAnswers(sessionId);
  const submitted = answers.filter((a) => a.status === 'submitted');
  if (submitted.length === 0) return '';
  return submitted
    .map((a) => `### ${a.taskKey}\n${JSON.stringify(a.value, null, 2)}`)
    .join('\n\n')
    .slice(0, 4000);
}

/**
 * Server-side steering for the negotiation.
 *
 * The buyer must not be able to "agree" to terms BITE could never sign, but she
 * also must not be told BITE's internal minimums. So the guardrail result is
 * converted into behavioural guidance, never into numbers she could quote.
 */
async function buildInternalNotes(
  session: ProjectSession,
  stepKey: string,
): Promise<string[]> {
  if (stepKey !== 'negotiation') return [];

  const repo = getRepository();
  const scenario = getScenarioForSession(session);
  const notes: string[] = [];

  for (const taskKey of ['final-agreed-package', 'proposal-v1']) {
    const found = findTask(scenario, taskKey);
    if (!found) continue;
    const answer = await repo.getAnswer(session.id, taskKey);
    if (!answer) continue;
    const warnings = evaluateGuardrails(found.task.guardrailKeys, answer.value);
    if (hasViolations(warnings)) {
      notes.push(
        'The terms the representative is working from would be rejected internally by their own company. You do not know why and you must not say so. Keep probing for concrete terms and do not treat anything as finally agreed.',
      );
      break;
    }
  }
  return notes;
}

/**
 * Every fact this student has already earned from this persona, across every
 * conversation in the session.
 *
 * The ledger is deliberately session-wide per persona rather than per
 * conversation: the buyer appears in both the meeting and the negotiation, and
 * a number she already gave is not a new discovery the second time it comes up.
 * The individual conversation still records where a fact was first disclosed.
 */
async function collectRevealedFactIds(
  sessionId: string,
  personaKey: string,
): Promise<string[]> {
  const conversations = await getRepository().listConversations(sessionId);
  const ids = new Set<string>();
  for (const conversation of conversations) {
    if (conversation.personaKey !== personaKey) continue;
    for (const id of conversation.revealedFactIds) ids.add(id);
  }
  return Array.from(ids);
}

/** Heuristic only — used as behavioural evidence, never as a score. */
function looksLikeFollowUp(message: string, lastPersonaMessage?: string): boolean {
  if (!lastPersonaMessage) return false;
  const words = new Set(
    lastPersonaMessage
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 4),
  );
  if (words.size === 0) return false;
  const studentWords = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4);
  return studentWords.some((w) => words.has(w));
}

export async function openConversation(
  session: ProjectSession,
  personaKey: string,
  stepKey: string,
): Promise<ConversationView> {
  const repo = getRepository();
  const persona = requirePersona(session, personaKey);

  const conversation = await repo.getOrCreateConversation({
    sessionId: session.id,
    personaKey,
    stepKey,
  });

  const existing = await repo.listMessages(conversation.id);
  if (existing.length === 0) {
    await repo.appendMessage({
      conversationId: conversation.id,
      role: 'persona',
      content: persona.openingMessage,
      metadata: { opening: true },
    });
    await logEvent({
      userId: session.userId,
      sessionId: session.id,
      departmentSlug: session.departmentSlug,
      stepKey,
      eventType: 'ai_conversation_started',
      metadata: { personaKey },
    });
  }

  return buildConversationView(session, personaKey, stepKey);
}

export async function sendStudentMessage(
  session: ProjectSession,
  personaKey: string,
  stepKey: string,
  message: string,
): Promise<ConversationView> {
  const repo = getRepository();
  const persona = requirePersona(session, personaKey);

  const conversation = await repo.getOrCreateConversation({
    sessionId: session.id,
    personaKey,
    stepKey,
  });
  if (conversation.status === 'ended') {
    throw new Error('This conversation has already ended.');
  }

  const history = await repo.listMessages(conversation.id);
  const lastPersonaMessage = [...history]
    .reverse()
    .find((m) => m.role === 'persona')?.content;

  await repo.appendMessage({
    conversationId: conversation.id,
    role: 'student',
    content: message,
  });

  const isFollowUp = looksLikeFollowUp(message, lastPersonaMessage);
  await logEvent({
    userId: session.userId,
    sessionId: session.id,
    departmentSlug: session.departmentSlug,
    stepKey,
    eventType: isFollowUp ? 'ai_followup_asked' : 'ai_message_sent',
    metadata: {
      personaKey,
      messageLength: message.length,
      turnIndex: history.filter((m) => m.role === 'student').length,
    },
  });

  const studentWorkSummary = persona.contextPolicy.includeStudentWork
    ? await buildStudentWorkSummary(session.id)
    : '';

  const alreadyRevealedFactIds = await collectRevealedFactIds(
    session.id,
    persona.key,
  );

  const response = await getScenarioAIService().sendMessage({
    persona,
    scenarioContext: publicScenarioContext(),
    studentWorkSummary,
    history: toTurns(history),
    message,
    alreadyRevealedFactIds,
    mode: stepKey === 'negotiation' ? 'negotiation' : 'meeting',
    internalNotes: await buildInternalNotes(session, stepKey),
  });

  // Only ids that exist on this persona and are genuinely new can be recorded.
  const knownHiddenIds = new Set(
    persona.facts.filter((f) => f.visibility === 'hidden').map((f) => f.id),
  );
  const newlyRevealed = response.revealedFactIds.filter(
    (id) => knownHiddenIds.has(id) && !alreadyRevealedFactIds.includes(id),
  );

  await repo.appendMessage({
    conversationId: conversation.id,
    role: 'persona',
    content: response.content,
    metadata: { revealedFactIds: newlyRevealed, source: response.source },
  });

  if (newlyRevealed.length > 0) {
    await repo.updateConversation(conversation.id, {
      revealedFactIds: [...conversation.revealedFactIds, ...newlyRevealed],
    });
    for (const factId of newlyRevealed) {
      await logEvent({
        userId: session.userId,
        sessionId: session.id,
        departmentSlug: session.departmentSlug,
        stepKey,
        eventType: 'ai_fact_revealed',
        metadata: { personaKey, factId },
      });
    }
  }

  return buildConversationView(session, personaKey, stepKey);
}

export async function endConversation(
  session: ProjectSession,
  personaKey: string,
  stepKey: string,
): Promise<ConversationView> {
  const repo = getRepository();
  const conversation = await repo.getOrCreateConversation({
    sessionId: session.id,
    personaKey,
    stepKey,
  });

  if (conversation.status !== 'ended') {
    await repo.updateConversation(conversation.id, {
      status: 'ended',
      endedAt: new Date().toISOString(),
    });
    await logEvent({
      userId: session.userId,
      sessionId: session.id,
      departmentSlug: session.departmentSlug,
      stepKey,
      eventType: 'ai_conversation_ended',
      metadata: {
        personaKey,
        revealedFactCount: conversation.revealedFactIds.length,
      },
    });

    const scenario = getScenarioForSession(session);
    const state = await loadEngineState(session.id);
    await syncProgress(session, scenario, state);
  }

  return buildConversationView(session, personaKey, stepKey);
}

export async function buildConversationView(
  session: ProjectSession,
  personaKey: string,
  stepKey: string,
): Promise<ConversationView> {
  const repo = getRepository();
  const persona = requirePersona(session, personaKey);
  const conversation = await repo.getOrCreateConversation({
    sessionId: session.id,
    personaKey,
    stepKey,
  });
  const messages = await repo.listMessages(conversation.id);

  const labelById = new Map(persona.facts.map((f) => [f.id, f.label] as const));
  const revealedAcrossSession = await collectRevealedFactIds(session.id, personaKey);

  return {
    id: conversation.id,
    personaKey,
    status: conversation.status,
    messages: messages
      .filter((m) => m.role !== 'system')
      .map((m) => toMessageView(m, labelById)),
    studentMessageCount: messages.filter((m) => m.role === 'student').length,
    // What the student knows from this persona, not just from this transcript.
    discoveredFactCount: revealedAcrossSession.length,
    totalDiscoverableFactCount: persona.facts.filter(
      (f) => f.visibility === 'hidden',
    ).length,
  };
}

function toMessageView(
  message: AiMessage,
  labelById: Map<string, string>,
): ConversationView['messages'][number] {
  const ids = Array.isArray(message.metadata.revealedFactIds)
    ? (message.metadata.revealedFactIds as string[])
    : [];
  return {
    id: message.id,
    role: message.role === 'student' ? 'student' : 'persona',
    content: message.content,
    createdAt: message.createdAt,
    // Labels only — the hidden content is already in the reply the buyer gave.
    revealedFactLabels: ids
      .map((id) => labelById.get(id))
      .filter((l): l is string => Boolean(l)),
  };
}

function toTurns(messages: AiMessage[]): AiTurn[] {
  return messages
    .filter((m) => m.role !== 'system')
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({
      role: m.role === 'student' ? ('student' as const) : ('persona' as const),
      content: m.content,
    }));
}

function requirePersona(
  session: ProjectSession,
  personaKey: string,
): PersonaDefinition {
  const persona = getPersona(session.scenarioKey, personaKey);
  if (!persona) {
    throw new Error(`Unknown persona ${personaKey} for ${session.scenarioKey}`);
  }
  return persona;
}

/** Guards that a persona is actually reachable from the requested step. */
export function assertPersonaAllowedInStep(
  session: ProjectSession,
  personaKey: string,
  stepKey: string,
): void {
  const persona = requirePersona(session, personaKey);
  if (!persona.stepKeys.includes(stepKey)) {
    throw new Error(`Persona ${personaKey} is not available in step ${stepKey}`);
  }
  const scenario = getScenarioForSession(session);
  if (!getStep(scenario, stepKey)) {
    throw new Error(`Unknown step ${stepKey}`);
  }
}
