/** Runtime (per-student) state types. */

export type SessionStatus = 'not_started' | 'in_progress' | 'completed' | 'expired';
export type StepStatus = 'locked' | 'available' | 'in_progress' | 'completed';
export type AnswerStatus = 'draft' | 'submitted';
export type ConversationStatus = 'open' | 'ended';
export type MessageRole = 'student' | 'persona' | 'system';

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: 'student' | 'admin';
  createdAt: string;
};

export type ProjectSession = {
  id: string;
  userId: string;
  departmentSlug: string;
  projectKey: string;
  scenarioKey: string;
  scenarioVersion: number;
  status: SessionStatus;
  currentStepKey: string | null;
  startedAt: string;
  deadlineAt: string;
  completedAt: string | null;
};

export type StepProgress = {
  sessionId: string;
  stepKey: string;
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
};

/** Arbitrary structured answer value, shaped by the task's field definitions. */
export type AnswerValue = Record<string, unknown>;

export type TaskAnswer = {
  sessionId: string;
  taskKey: string;
  value: AnswerValue;
  status: AnswerStatus;
  version: number;
  updatedAt: string;
  submittedAt: string | null;
};

export type TaskAnswerRevision = {
  id: string;
  sessionId: string;
  taskKey: string;
  version: number;
  previousValue: AnswerValue | null;
  value: AnswerValue;
  createdAt: string;
};

export type Submission = {
  id: string;
  sessionId: string;
  taskKey: string;
  title: string;
  /** Immutable snapshot of everything that fed this submission. */
  snapshot: Record<string, unknown>;
  createdAt: string;
};

export type AiConversation = {
  id: string;
  sessionId: string;
  personaKey: string;
  stepKey: string;
  status: ConversationStatus;
  /** Server-side record of which hidden facts the student has already earned. */
  revealedFactIds: string[];
  startedAt: string;
  endedAt: string | null;
};

export type AiMessage = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type BehaviorEventType =
  | 'department_started'
  | 'department_completed'
  | 'step_started'
  | 'step_completed'
  | 'resource_opened'
  | 'resource_closed'
  | 'task_started'
  | 'answer_saved'
  | 'task_submitted'
  | 'decision_submitted'
  | 'decision_revised'
  | 'ai_conversation_started'
  | 'ai_message_sent'
  | 'ai_followup_asked'
  | 'ai_fact_revealed'
  | 'ai_conversation_ended'
  | 'unexpected_event_viewed'
  | 'guardrail_warning_shown'
  | 'final_submission_created'
  | 'office_zone_entered'
  | 'npc_interaction_started';

export type BehaviorEvent = {
  id: string;
  userId: string;
  sessionId: string | null;
  departmentSlug: string | null;
  stepKey: string | null;
  taskKey: string | null;
  eventType: BehaviorEventType;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

export type PreSurvey = {
  userId: string;
  answers: Record<string, unknown>;
  submittedAt: string;
};

export type DepartmentSelection = {
  userId: string;
  departmentSlugs: string[];
  selectedAt: string;
};
