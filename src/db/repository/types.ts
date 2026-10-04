import type {
  AiConversation,
  AiMessage,
  AnswerValue,
  BehaviorEvent,
  BehaviorEventType,
  DepartmentSelection,
  PreSurvey,
  ProjectSession,
  SessionStatus,
  StepProgress,
  StepStatus,
  Submission,
  TaskAnswer,
  TaskAnswerRevision,
  User,
} from '@/types/runtime';

export type CreateSessionInput = {
  userId: string;
  departmentSlug: string;
  projectKey: string;
  scenarioKey: string;
  scenarioVersion: number;
  deadlineHours: number;
  initialStepKey: string;
};

export type SaveAnswerInput = {
  sessionId: string;
  taskKey: string;
  value: AnswerValue;
  status: 'draft' | 'submitted';
};

export type RecordEventInput = {
  userId: string;
  sessionId: string | null;
  departmentSlug?: string | null;
  stepKey?: string | null;
  taskKey?: string | null;
  eventType: BehaviorEventType;
  metadata?: Record<string, unknown>;
};

export type EventFilter = {
  sessionId?: string;
  userId?: string;
  limit?: number;
};

/**
 * Persistence contract for all student runtime state.
 *
 * Two implementations exist and must stay behaviourally identical:
 *  - `DrizzleRepository` (Neon PostgreSQL, production)
 *  - `FileRepository`    (local JSON, used when DATABASE_URL is absent)
 */
export interface XPassRepository {
  readonly mode: 'neon' | 'file';

  // --- identity -----------------------------------------------------------
  findUserByEmail(email: string): Promise<User | null>;
  getUser(id: string): Promise<User | null>;
  createUser(input: { email: string; displayName: string }): Promise<User>;

  // --- onboarding ---------------------------------------------------------
  savePreSurvey(userId: string, answers: Record<string, unknown>): Promise<PreSurvey>;
  getPreSurvey(userId: string): Promise<PreSurvey | null>;
  saveDepartmentSelection(
    userId: string,
    departmentSlugs: string[],
  ): Promise<DepartmentSelection>;
  getDepartmentSelection(userId: string): Promise<DepartmentSelection | null>;

  // --- sessions -----------------------------------------------------------
  createSession(input: CreateSessionInput): Promise<ProjectSession>;
  getSession(sessionId: string): Promise<ProjectSession | null>;
  listSessionsForUser(userId: string): Promise<ProjectSession[]>;
  findActiveSession(
    userId: string,
    departmentSlug: string,
  ): Promise<ProjectSession | null>;
  updateSession(
    sessionId: string,
    patch: Partial<Pick<ProjectSession, 'status' | 'currentStepKey' | 'completedAt'>> & {
      status?: SessionStatus;
    },
  ): Promise<ProjectSession>;

  // --- step progress ------------------------------------------------------
  listStepProgress(sessionId: string): Promise<StepProgress[]>;
  upsertStepProgress(
    sessionId: string,
    stepKey: string,
    patch: { status?: StepStatus; startedAt?: string | null; completedAt?: string | null },
  ): Promise<StepProgress>;

  // --- answers ------------------------------------------------------------
  listAnswers(sessionId: string): Promise<TaskAnswer[]>;
  getAnswer(sessionId: string, taskKey: string): Promise<TaskAnswer | null>;
  /** Appends a revision row whenever the stored value actually changes. */
  saveAnswer(input: SaveAnswerInput): Promise<TaskAnswer>;
  listRevisions(sessionId: string, taskKey?: string): Promise<TaskAnswerRevision[]>;

  // --- submissions --------------------------------------------------------
  createSubmission(input: {
    sessionId: string;
    taskKey: string;
    title: string;
    snapshot: Record<string, unknown>;
  }): Promise<Submission>;
  listSubmissions(sessionId: string): Promise<Submission[]>;

  // --- AI conversations ---------------------------------------------------
  getOrCreateConversation(input: {
    sessionId: string;
    personaKey: string;
    stepKey: string;
  }): Promise<AiConversation>;
  getConversation(conversationId: string): Promise<AiConversation | null>;
  listConversations(sessionId: string): Promise<AiConversation[]>;
  updateConversation(
    conversationId: string,
    patch: Partial<Pick<AiConversation, 'status' | 'revealedFactIds' | 'endedAt'>> & {
      state?: Record<string, unknown>;
    },
  ): Promise<AiConversation>;
  appendMessage(input: {
    conversationId: string;
    role: AiMessage['role'];
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<AiMessage>;
  listMessages(conversationId: string): Promise<AiMessage[]>;

  // --- behavior events ----------------------------------------------------
  recordEvent(input: RecordEventInput): Promise<BehaviorEvent>;
  listEvents(filter: EventFilter): Promise<BehaviorEvent[]>;
}
