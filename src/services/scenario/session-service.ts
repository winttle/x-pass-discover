import 'server-only';
import { getRepository } from '@/db/repository';
import { getDepartment } from '@/content/departments';
import { MEDIA } from '@/content/media';
import {
  getPublishedScenario,
  getScenarioVersion,
  listResources,
} from '@/content/registry';
import { listPublicPersonas } from '@/content/personas.server';
import { env, runtimeModeSummary } from '@/lib/env';
import { ScenarioRuleError } from '@/lib/errors';
import { logEvent } from '@/services/events';
import type { ProjectSession, StepStatus, TaskAnswer } from '@/types/runtime';
import type { ScenarioVersionDefinition } from '@/types/scenario';
import type { SessionView, StepView, TaskView } from '@/types/session-view';
import {
  describeLock,
  isScenarioComplete,
  isStepComplete,
  isUnlocked,
  resolveCurrentStepKey,
  resolveTaskPrefill,
  studentMessageCount,
  taskStatus,
  conversationForStep,
  type EngineState,
} from './engine';

/**
 * Session orchestration: load runtime state, project it for the client, and
 * keep derived progress (step statuses, current step, session completion) in
 * sync after every mutation.
 */

export class SessionAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionAccessError';
  }
}

export async function loadEngineState(sessionId: string): Promise<EngineState> {
  const repo = getRepository();
  const [answers, conversations, progress] = await Promise.all([
    repo.listAnswers(sessionId),
    repo.listConversations(sessionId),
    repo.listStepProgress(sessionId),
  ]);

  const messageCounts: Record<string, number> = {};
  await Promise.all(
    conversations.map(async (conversation) => {
      const messages = await repo.listMessages(conversation.id);
      messageCounts[conversation.id] = messages.filter(
        (m) => m.role === 'student',
      ).length;
    }),
  );

  return {
    answersByTaskKey: Object.fromEntries(
      answers.map((a) => [a.taskKey, a] as const),
    ) as Record<string, TaskAnswer>,
    conversations,
    conversationMessageCounts: messageCounts,
    progressByStepKey: Object.fromEntries(
      progress.map((p) => [p.stepKey, p] as const),
    ),
  };
}

export function getScenarioForSession(
  session: ProjectSession,
): ScenarioVersionDefinition {
  const scenario = getScenarioVersion(session.scenarioKey, session.scenarioVersion);
  if (!scenario) {
    throw new Error(
      `Scenario ${session.scenarioKey} v${session.scenarioVersion} is not registered.`,
    );
  }
  return scenario;
}

/** Loads a session and enforces that it belongs to the caller. */
export async function requireOwnedSession(
  sessionId: string,
  userId: string,
): Promise<ProjectSession> {
  const session = await getRepository().getSession(sessionId);
  if (!session) throw new SessionAccessError('Session not found');
  if (session.userId !== userId) {
    throw new SessionAccessError('Session does not belong to the current user');
  }
  return session;
}

// -------------------------------------------------------------- projection

function buildTaskView(
  scenario: ScenarioVersionDefinition,
  stepKey: string,
  task: ScenarioVersionDefinition['steps'][number]['tasks'][number],
  state: EngineState,
): TaskView {
  const answer = state.answersByTaskKey[task.key] ?? null;
  const conversation = task.personaKey
    ? conversationForStep(state, task.personaKey, stepKey)
    : null;

  const minStudentMessages =
    task.completion.type === 'conversation_ended'
      ? (task.completion.minStudentMessages ?? 0)
      : 0;
  const sentCount = conversation
    ? studentMessageCount(state, conversation.id)
    : 0;

  return {
    key: task.key,
    title: task.title,
    instructions: task.instructions ?? null,
    kind: task.kind,
    required: task.required !== false,
    fields: task.fields ?? [],
    personaKey: task.personaKey ?? null,
    referenceTaskKeys: task.referenceTaskKeys ?? [],
    guardrailKeys: task.guardrailKeys ?? [],
    status: taskStatus(task, state, stepKey),
    value: answer?.value ?? {},
    version: answer?.version ?? 0,
    updatedAt: answer?.updatedAt ?? null,
    submittedAt: answer?.submittedAt ?? null,
    prefill: resolveTaskPrefill(task, state),
    conversation: conversation
      ? {
          id: conversation.id,
          status: conversation.status,
          studentMessageCount: sentCount,
          minStudentMessages,
          canEnd: sentCount >= minStudentMessages,
        }
      : null,
  };
}

export function buildSessionView(
  session: ProjectSession,
  scenario: ScenarioVersionDefinition,
  state: EngineState,
): SessionView {
  const department = getDepartment(session.departmentSlug);

  const steps: StepView[] = [...scenario.steps]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((step) => {
      const unlocked = isUnlocked(step.unlockRule, scenario, state);
      const complete = isStepComplete(step, state);
      const stored = state.progressByStepKey[step.key];

      let status: StepStatus = 'locked';
      if (complete) status = 'completed';
      else if (unlocked) {
        status = stored?.status === 'in_progress' ? 'in_progress' : 'available';
      }

      return {
        key: step.key,
        title: step.title,
        stepType: step.stepType,
        summary: step.summary ?? null,
        instructions: step.instructions ?? null,
        estimatedMinutes: step.estimatedMinutes ?? null,
        sortOrder: step.sortOrder,
        officeZoneKey: step.officeZoneKey ?? null,
        status,
        unlocked,
        lockedReason: unlocked ? null : describeLock(step.unlockRule, scenario),
        resourceKeys: step.resourceKeys ?? [],
        eventPayload: step.eventPayload ?? null,
        media: step.media ?? null,
        tasks: step.tasks.map((task) =>
          buildTaskView(scenario, step.key, task, state),
        ),
      } satisfies StepView;
    });

  return {
    session,
    scenario: {
      key: scenario.scenarioKey,
      version: scenario.version,
      title: scenario.title,
      studentRole: scenario.studentRole,
      mission: scenario.mission,
      finalOutputTitle: scenario.finalOutputTitle,
    },
    department: {
      slug: session.departmentSlug,
      name: department?.name ?? session.departmentSlug,
      accentColor: department?.accentColor ?? '#2563eb',
      projectTitle: department?.projectTitle ?? scenario.title,
      coverImage: department?.coverImage ?? MEDIA.companyOffice.src,
    },
    steps,
    resources: listResources(session.scenarioKey),
    personas: listPublicPersonas(session.scenarioKey),
    progress: {
      completedSteps: steps.filter((s) => s.status === 'completed').length,
      totalSteps: steps.length,
      currentStepKey: session.currentStepKey,
    },
    runtime: runtimeModeSummary(),
  };
}

export async function loadSessionView(
  sessionId: string,
  userId: string,
): Promise<SessionView> {
  const session = await requireOwnedSession(sessionId, userId);
  const scenario = getScenarioForSession(session);
  const state = await loadEngineState(sessionId);
  return buildSessionView(session, scenario, state);
}

// --------------------------------------------------------------- progression

/**
 * Recomputes derived progress after any mutation and persists the delta.
 * Emits `step_started` / `step_completed` exactly once per transition.
 */
export async function syncProgress(
  session: ProjectSession,
  scenario: ScenarioVersionDefinition,
  state: EngineState,
): Promise<ProjectSession> {
  const repo = getRepository();

  for (const step of scenario.steps) {
    const unlocked = isUnlocked(step.unlockRule, scenario, state);
    const complete = isStepComplete(step, state);
    const stored = state.progressByStepKey[step.key];
    const previous = stored?.status ?? 'locked';

    let next: StepStatus = 'locked';
    if (complete) next = 'completed';
    else if (unlocked) {
      next = previous === 'in_progress' ? 'in_progress' : 'available';
    }

    if (next === previous) continue;

    await repo.upsertStepProgress(session.id, step.key, {
      status: next,
      ...(next === 'completed' ? { completedAt: new Date().toISOString() } : {}),
      ...(previous === 'locked' && next !== 'locked' && !stored?.startedAt
        ? { startedAt: new Date().toISOString() }
        : {}),
    });

    if (next === 'completed' && previous !== 'completed') {
      await logEvent({
        userId: session.userId,
        sessionId: session.id,
        departmentSlug: session.departmentSlug,
        stepKey: step.key,
        eventType: 'step_completed',
        metadata: { stepType: step.stepType },
      });
    }
  }

  const currentStepKey = resolveCurrentStepKey(scenario, state);
  const scenarioComplete = isScenarioComplete(scenario, state);

  const patch: Parameters<typeof repo.updateSession>[1] = {};
  if (currentStepKey !== session.currentStepKey) patch.currentStepKey = currentStepKey;
  if (scenarioComplete && session.status !== 'completed') {
    patch.status = 'completed';
    patch.completedAt = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) return session;

  const updated = await repo.updateSession(session.id, patch);

  if (patch.status === 'completed') {
    await logEvent({
      userId: session.userId,
      sessionId: session.id,
      departmentSlug: session.departmentSlug,
      eventType: 'department_completed',
      metadata: { scenarioKey: scenario.scenarioKey },
    });
  }

  return updated;
}

/** Marks a step as in-progress the first time the student opens it. */
export async function markStepStarted(
  session: ProjectSession,
  stepKey: string,
): Promise<void> {
  const repo = getRepository();
  const existing = (await repo.listStepProgress(session.id)).find(
    (p) => p.stepKey === stepKey,
  );
  if (existing?.status === 'in_progress' || existing?.status === 'completed') return;

  await repo.upsertStepProgress(session.id, stepKey, {
    status: 'in_progress',
    startedAt: existing?.startedAt ?? new Date().toISOString(),
  });
  await logEvent({
    userId: session.userId,
    sessionId: session.id,
    departmentSlug: session.departmentSlug,
    stepKey,
    eventType: 'step_started',
  });
}

// ------------------------------------------------------------ session create

export async function startSession(
  userId: string,
  departmentSlug: string,
): Promise<ProjectSession> {
  const repo = getRepository();
  const department = getDepartment(departmentSlug);

  if (!department) {
    throw new ScenarioRuleError(`Unknown department: ${departmentSlug}`);
  }
  if (department.status !== 'playable' || !department.scenarioKey) {
    throw new ScenarioRuleError(`${department.name} is not playable yet.`);
  }

  const existing = await repo.findActiveSession(userId, departmentSlug);
  if (existing) return existing;

  const scenario = getPublishedScenario(department.scenarioKey);
  if (!scenario) {
    throw new Error(`No published scenario for ${department.scenarioKey}`);
  }

  const firstStep = [...scenario.steps].sort((a, b) => a.sortOrder - b.sortOrder)[0];

  const session = await repo.createSession({
    userId,
    departmentSlug,
    projectKey: department.projectKey,
    scenarioKey: scenario.scenarioKey,
    scenarioVersion: scenario.version,
    deadlineHours: scenario.deadlineHours,
    initialStepKey: firstStep?.key ?? '',
  });

  // Seed step progress so the first step is immediately available.
  const state = await loadEngineState(session.id);
  for (const step of scenario.steps) {
    await repo.upsertStepProgress(session.id, step.key, {
      status: isUnlocked(step.unlockRule, scenario, state) ? 'available' : 'locked',
    });
  }

  await logEvent({
    userId,
    sessionId: session.id,
    departmentSlug,
    eventType: 'department_started',
    metadata: {
      scenarioKey: scenario.scenarioKey,
      scenarioVersion: scenario.version,
      persistence: env.persistenceMode,
    },
  });

  return session;
}
