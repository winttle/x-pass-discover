import 'server-only';
import { getRepository } from '@/db/repository';
import { findTask } from '@/content/registry';
import { ScenarioRuleError } from '@/lib/errors';
import { logEvent } from '@/services/events';
import type { AnswerValue, ProjectSession } from '@/types/runtime';
import type { TaskField } from '@/types/scenario';
import type { SessionView } from '@/types/session-view';
import { isUnlocked } from './engine';
import { evaluateGuardrails, type GuardrailWarning } from './guardrails';
import {
  buildSessionView,
  getScenarioForSession,
  loadEngineState,
  syncProgress,
} from './session-service';

/**
 * Task save / submit.
 *
 * Guardrails warn, they never rewrite an answer and never block the save — a
 * student is allowed to submit a deal BITE would reject, and that choice is
 * itself evidence. What they cannot do is write into a step that is still
 * locked, or send keys that are not in the task definition.
 */

export type SaveTaskResult = {
  view: SessionView;
  warnings: GuardrailWarning[];
};

/** Keeps only keys declared by the task's own fields. */
function sanitizeValue(fields: TaskField[], input: unknown): AnswerValue {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const output: AnswerValue = {};

  for (const field of fields) {
    const raw = source[field.key];
    if (raw === undefined) continue;

    if (field.type === 'repeatable_group') {
      if (!Array.isArray(raw)) continue;
      const maxRows = field.maxRows ?? 50;
      output[field.key] = raw.slice(0, maxRows).map((row) => {
        if (!row || typeof row !== 'object') return {};
        const rowSource = row as Record<string, unknown>;
        const cleaned: Record<string, unknown> = {};
        for (const sub of field.fields ?? []) {
          if (rowSource[sub.key] !== undefined) cleaned[sub.key] = rowSource[sub.key];
        }
        return cleaned;
      });
      continue;
    }

    if (field.type === 'number') {
      if (raw === '' || raw === null) {
        output[field.key] = null;
      } else {
        const n = Number(raw);
        output[field.key] = Number.isFinite(n) ? n : null;
      }
      continue;
    }

    if (field.type === 'multi_select' || field.type === 'resource_evidence') {
      output[field.key] = Array.isArray(raw)
        ? raw.filter((v) => typeof v === 'string')
        : [];
      continue;
    }

    output[field.key] = raw;
  }

  // Acknowledgement tasks carry no fields but do carry a flag.
  if (source.acknowledged === true) output.acknowledged = true;

  return output;
}

export async function saveTaskAnswer(input: {
  session: ProjectSession;
  taskKey: string;
  value: unknown;
  status: 'draft' | 'submitted';
}): Promise<SaveTaskResult> {
  const repo = getRepository();
  const { session, taskKey, status } = input;

  const scenario = getScenarioForSession(session);
  const found = findTask(scenario, taskKey);
  if (!found) throw new ScenarioRuleError(`Unknown task: ${taskKey}`);
  const { step, task } = found;

  const stateBefore = await loadEngineState(session.id);
  if (!isUnlocked(step.unlockRule, scenario, stateBefore)) {
    throw new ScenarioRuleError(`Step “${step.title}” is not available yet.`);
  }

  const previous = stateBefore.answersByTaskKey[taskKey] ?? null;
  const value = sanitizeValue(task.fields ?? [], input.value);
  const warnings = evaluateGuardrails(task.guardrailKeys, value);

  const answer = await repo.saveAnswer({
    sessionId: session.id,
    taskKey,
    value,
    status,
  });

  const isRevision = Boolean(previous && previous.version < answer.version);

  await logEvent({
    userId: session.userId,
    sessionId: session.id,
    departmentSlug: session.departmentSlug,
    stepKey: step.key,
    taskKey,
    eventType: status === 'submitted' ? 'task_submitted' : 'answer_saved',
    metadata: { version: answer.version, stepType: step.stepType },
  });

  if (status === 'submitted' && step.stepType === 'decision') {
    await logEvent({
      userId: session.userId,
      sessionId: session.id,
      departmentSlug: session.departmentSlug,
      stepKey: step.key,
      taskKey,
      eventType: 'decision_submitted',
      metadata: { version: answer.version },
    });
  }

  if (isRevision && previous?.status === 'submitted') {
    await logEvent({
      userId: session.userId,
      sessionId: session.id,
      departmentSlug: session.departmentSlug,
      stepKey: step.key,
      taskKey,
      eventType: 'decision_revised',
      metadata: { fromVersion: previous.version, toVersion: answer.version },
    });
  }

  if (warnings.length > 0 && status === 'submitted') {
    await logEvent({
      userId: session.userId,
      sessionId: session.id,
      departmentSlug: session.departmentSlug,
      stepKey: step.key,
      taskKey,
      eventType: 'guardrail_warning_shown',
      metadata: { warnings: warnings.map((w) => ({ key: w.key, severity: w.severity })) },
    });
  }

  // A final submission freezes an immutable snapshot of everything behind it.
  if (status === 'submitted' && task.kind === 'final_submission') {
    const [allAnswers, conversations] = await Promise.all([
      repo.listAnswers(session.id),
      repo.listConversations(session.id),
    ]);

    const submission = await repo.createSubmission({
      sessionId: session.id,
      taskKey,
      title: scenario.finalOutputTitle,
      snapshot: {
        scenarioKey: scenario.scenarioKey,
        scenarioVersion: scenario.version,
        submittedAt: new Date().toISOString(),
        finalAnswer: value,
        allAnswers: Object.fromEntries(
          allAnswers.map((a) => [a.taskKey, { value: a.value, version: a.version }]),
        ),
        conversations: conversations.map((c) => ({
          personaKey: c.personaKey,
          stepKey: c.stepKey,
          revealedFactIds: c.revealedFactIds,
        })),
        guardrailWarnings: warnings,
      },
    });

    await logEvent({
      userId: session.userId,
      sessionId: session.id,
      departmentSlug: session.departmentSlug,
      stepKey: step.key,
      taskKey,
      eventType: 'final_submission_created',
      metadata: { submissionId: submission.id },
    });
  }

  const stateAfter = await loadEngineState(session.id);
  const updatedSession = await syncProgress(session, scenario, stateAfter);

  return {
    view: buildSessionView(updatedSession, scenario, stateAfter),
    warnings,
  };
}
