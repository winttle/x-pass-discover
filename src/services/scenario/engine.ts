import type {
  ScenarioStepDefinition,
  ScenarioVersionDefinition,
  TaskCompletionRule,
  TaskDefinition,
  TaskField,
  UnlockRule,
} from '@/types/scenario';
import type {
  AiConversation,
  AnswerValue,
  StepProgress,
  TaskAnswer,
} from '@/types/runtime';
import type { TaskStatus } from '@/types/session-view';
import { resolvePrefillTemplate } from '@/lib/prefill';

/**
 * Scenario engine — pure evaluation logic.
 *
 * Everything here is a function of (scenario definition, runtime state). There
 * is no Sales-specific branching and no I/O, which keeps it testable and keeps
 * the rules in content where other departments can reuse them.
 */

export type EngineState = {
  answersByTaskKey: Record<string, TaskAnswer>;
  conversations: AiConversation[];
  conversationMessageCounts: Record<string, number>;
  progressByStepKey: Record<string, StepProgress>;
};

// --------------------------------------------------------------------- values

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** A repeatable-group row counts only when every required sub-field is filled. */
export function countCompleteRows(field: TaskField, value: AnswerValue): number {
  const rows = value[field.key];
  if (!Array.isArray(rows)) return 0;
  const requiredSubKeys = (field.fields ?? [])
    .filter((f) => f.required)
    .map((f) => f.key);
  return rows.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    const record = row as Record<string, unknown>;
    return requiredSubKeys.every((key) => !isBlank(record[key]));
  }).length;
}

export function missingRequiredFields(
  task: TaskDefinition,
  value: AnswerValue,
): string[] {
  const missing: string[] = [];
  for (const field of task.fields ?? []) {
    if (!field.required) continue;
    if (field.type === 'repeatable_group') {
      const min = field.minRows ?? 1;
      if (countCompleteRows(field, value) < min) missing.push(field.key);
      continue;
    }
    if (isBlank(value[field.key])) missing.push(field.key);
  }
  return missing;
}

// ----------------------------------------------------------------- completion

export function isTaskComplete(
  task: TaskDefinition,
  state: EngineState,
  stepKey: string,
): boolean {
  return evaluateTaskRule(task.completion, task, state, stepKey);
}

function evaluateTaskRule(
  rule: TaskCompletionRule,
  task: TaskDefinition,
  state: EngineState,
  stepKey: string,
): boolean {
  const answer = state.answersByTaskKey[task.key];
  const value = answer?.value ?? {};

  switch (rule.type) {
    case 'all':
      return rule.rules.every((r) => evaluateTaskRule(r, task, state, stepKey));

    case 'submitted':
      return answer?.status === 'submitted';

    case 'required_fields':
      return missingRequiredFields(task, value).length === 0;

    case 'min_rows': {
      const field = (task.fields ?? []).find((f) => f.key === rule.fieldKey);
      if (!field) return false;
      return countCompleteRows(field, value) >= rule.min;
    }

    case 'acknowledged':
      return value.acknowledged === true;

    case 'conversation_ended': {
      // Scoped to this task's own step: the same persona can appear in more
      // than one step (the QuickMart buyer runs both the meeting and the
      // negotiation), and those are separate conversations.
      const conversation = conversationForStep(state, rule.personaKey, stepKey);
      if (!conversation || conversation.status !== 'ended') return false;
      const min = rule.minStudentMessages ?? 0;
      return studentMessageCount(state, conversation.id) >= min;
    }

    default:
      return false;
  }
}

/** Conversations are keyed by (persona, step). */
function conversationForStep(
  state: EngineState,
  personaKey: string,
  stepKey: string,
): AiConversation | null {
  return (
    state.conversations.find(
      (c) => c.personaKey === personaKey && c.stepKey === stepKey,
    ) ?? null
  );
}

export function studentMessageCount(state: EngineState, conversationId: string) {
  return state.conversationMessageCounts[conversationId] ?? 0;
}

export function taskStatus(
  task: TaskDefinition,
  state: EngineState,
  stepKey: string,
): TaskStatus {
  if (isTaskComplete(task, state, stepKey)) return 'complete';
  const answer = state.answersByTaskKey[task.key];
  const conversation = task.personaKey
    ? conversationForStep(state, task.personaKey, stepKey)
    : null;
  if (answer || conversation) return 'draft';
  return 'not_started';
}

export function isStepComplete(
  step: ScenarioStepDefinition,
  state: EngineState,
): boolean {
  if (step.completionRule.type === 'manual') {
    return state.progressByStepKey[step.key]?.status === 'completed';
  }
  const required = step.tasks.filter((t) => t.required !== false);
  return required.every((task) => isTaskComplete(task, state, step.key));
}

// --------------------------------------------------------------------- unlock

export function isUnlocked(
  rule: UnlockRule,
  scenario: ScenarioVersionDefinition,
  state: EngineState,
): boolean {
  switch (rule.type) {
    case 'always':
      return true;

    case 'step_completed': {
      const step = scenario.steps.find((s) => s.key === rule.stepKey);
      return step ? isStepComplete(step, state) : false;
    }

    case 'task_submitted':
      return state.answersByTaskKey[rule.taskKey]?.status === 'submitted';

    case 'conversation_completed': {
      const conversation = rule.stepKey
        ? conversationForStep(state, rule.personaKey, rule.stepKey)
        : state.conversations.find((c) => c.personaKey === rule.personaKey) ?? null;
      return conversation?.status === 'ended';
    }

    case 'all':
      return rule.rules.every((r) => isUnlocked(r, scenario, state));

    case 'any':
      return rule.rules.some((r) => isUnlocked(r, scenario, state));

    default:
      return false;
  }
}

/** Human-readable explanation of why a step is still locked. */
export function describeLock(
  rule: UnlockRule,
  scenario: ScenarioVersionDefinition,
): string {
  switch (rule.type) {
    case 'always':
      return '';
    case 'step_completed': {
      const step = scenario.steps.find((s) => s.key === rule.stepKey);
      return `Complete “${step?.title ?? rule.stepKey}” first.`;
    }
    case 'task_submitted':
      return `Submit “${rule.taskKey}” first.`;
    case 'conversation_completed': {
      const step = rule.stepKey
        ? scenario.steps.find((s) => s.key === rule.stepKey)
        : null;
      return step
        ? `Finish the conversation in “${step.title}” first.`
        : 'Finish the required conversation first.';
    }
    case 'all':
      return rule.rules.map((r) => describeLock(r, scenario)).filter(Boolean).join(' ');
    case 'any':
      return rule.rules
        .map((r) => describeLock(r, scenario))
        .filter(Boolean)
        .join(' or ');
    default:
      return 'Not available yet.';
  }
}

// -------------------------------------------------------------------- prefill

export function resolveTaskPrefill(
  task: TaskDefinition,
  state: EngineState,
): Record<string, string> {
  const answersByTask: Record<string, AnswerValue> = {};
  for (const [key, answer] of Object.entries(state.answersByTaskKey)) {
    answersByTask[key] = answer.value;
  }

  const prefill: Record<string, string> = {};
  for (const field of task.fields ?? []) {
    if (!field.prefillTemplate) continue;
    prefill[field.key] = resolvePrefillTemplate(field.prefillTemplate, answersByTask);
  }
  return prefill;
}

// ---------------------------------------------------------------- progression

/** The first unlocked, incomplete step — where the student should resume. */
export function resolveCurrentStepKey(
  scenario: ScenarioVersionDefinition,
  state: EngineState,
): string | null {
  const ordered = [...scenario.steps].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const step of ordered) {
    if (!isUnlocked(step.unlockRule, scenario, state)) continue;
    if (!isStepComplete(step, state)) return step.key;
  }
  return ordered.at(-1)?.key ?? null;
}

export function isScenarioComplete(
  scenario: ScenarioVersionDefinition,
  state: EngineState,
): boolean {
  return scenario.steps
    .filter((s) => s.completionRule.type !== 'manual')
    .every((step) => isStepComplete(step, state));
}

export { conversationForStep };
