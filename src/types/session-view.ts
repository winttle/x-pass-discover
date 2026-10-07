import type { PublicPersona } from './ai';
import type { ResourceDefinition } from './resource';
import type {
  ScenarioEventPayload,
  ScenarioStepMedia,
  StepType,
  TaskField,
  TaskKind,
} from './scenario';
import type { AnswerValue, ProjectSession, StepStatus } from './runtime';

/** Client-safe projection of a running session. */

export type TaskStatus = 'not_started' | 'draft' | 'complete';

export type TaskView = {
  key: string;
  title: string;
  instructions: string | null;
  kind: TaskKind;
  required: boolean;
  fields: TaskField[];
  personaKey: string | null;
  referenceTaskKeys: string[];
  guardrailKeys: string[];
  status: TaskStatus;
  value: AnswerValue;
  version: number;
  updatedAt: string | null;
  submittedAt: string | null;
  /** Resolved `prefillTemplate` values for fields the student has not filled. */
  prefill: Record<string, string>;
  /** For `ai_conversation` tasks. */
  conversation: {
    id: string;
    status: 'open' | 'ended';
    studentMessageCount: number;
    minStudentMessages: number;
    canEnd: boolean;
  } | null;
};

export type StepView = {
  key: string;
  title: string;
  stepType: StepType;
  summary: string | null;
  instructions: string | null;
  estimatedMinutes: number | null;
  sortOrder: number;
  officeZoneKey: string | null;
  status: StepStatus;
  unlocked: boolean;
  lockedReason: string | null;
  resourceKeys: string[];
  eventPayload: ScenarioEventPayload | null;
  media: ScenarioStepMedia | null;
  tasks: TaskView[];
};

export type SessionView = {
  session: ProjectSession;
  scenario: {
    key: string;
    version: number;
    title: string;
    studentRole: string;
    mission: string;
    finalOutputTitle: string;
  };
  department: {
    slug: string;
    name: string;
    accentColor: string;
    projectTitle: string;
    coverImage: string;
  };
  steps: StepView[];
  resources: ResourceDefinition[];
  personas: PublicPersona[];
  progress: {
    completedSteps: number;
    totalSteps: number;
    currentStepKey: string | null;
  };
  runtime: {
    persistence: string;
    persistenceLabel: string;
    persistenceIsEphemeral: boolean;
    ai: string;
    aiLabel: string;
    aiModeDowngraded: boolean;
  };
};
