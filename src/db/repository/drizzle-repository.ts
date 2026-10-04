import 'server-only';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { requireDb, schema, type Database } from '@/db/client';
import { deepEquals } from '@/lib/stable-json';
import type {
  AiConversation,
  AiMessage,
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
import type {
  CreateSessionInput,
  EventFilter,
  RecordEventInput,
  SaveAnswerInput,
  XPassRepository,
} from './types';

const iso = (value: Date | null | undefined) =>
  value ? new Date(value).toISOString() : null;
const isoReq = (value: Date) => new Date(value).toISOString();

/**
 * Neon-backed persistence.
 *
 * Scenario *content* is addressed by stable keys (department slug, project key,
 * scenario key + version) so that application code never needs to carry UUIDs
 * around. This repository resolves those keys to foreign keys on write and
 * joins them back on read. Content must be seeded first (`npm run db:seed`).
 */
export class DrizzleRepository implements XPassRepository {
  readonly mode = 'neon' as const;

  /**
   * `injected` exists so the same repository can be pointed at any Postgres —
   * used to verify the SQL against an embedded Postgres without a Neon
   * connection. Production always resolves through `requireDb()`.
   */
  constructor(private readonly injected?: Database) {}

  private get db(): Database {
    return this.injected ?? requireDb();
  }

  // --- identity -----------------------------------------------------------

  async findUserByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.trim().toLowerCase()))
      .limit(1);
    return row ? this.toUser(row) : null;
  }

  async getUser(id: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return row ? this.toUser(row) : null;
  }

  async createUser(input: { email: string; displayName: string }): Promise<User> {
    const email = input.email.trim().toLowerCase();
    const [row] = await this.db
      .insert(schema.users)
      .values({ email, displayName: input.displayName })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: { displayName: input.displayName },
      })
      .returning();
    return this.toUser(row);
  }

  private toUser(row: typeof schema.users.$inferSelect): User {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role === 'admin' ? 'admin' : 'student',
      createdAt: isoReq(row.createdAt),
    };
  }

  // --- onboarding ---------------------------------------------------------

  async savePreSurvey(userId: string, answers: Record<string, unknown>) {
    const [row] = await this.db
      .insert(schema.preSurveys)
      .values({ userId, answers })
      .onConflictDoUpdate({
        target: schema.preSurveys.userId,
        set: { answers, submittedAt: new Date() },
      })
      .returning();
    return {
      userId: row.userId,
      answers: row.answers,
      submittedAt: isoReq(row.submittedAt),
    } satisfies PreSurvey;
  }

  async getPreSurvey(userId: string) {
    const [row] = await this.db
      .select()
      .from(schema.preSurveys)
      .where(eq(schema.preSurveys.userId, userId))
      .limit(1);
    return row
      ? ({
          userId: row.userId,
          answers: row.answers,
          submittedAt: isoReq(row.submittedAt),
        } satisfies PreSurvey)
      : null;
  }

  async saveDepartmentSelection(userId: string, departmentSlugs: string[]) {
    const [row] = await this.db
      .insert(schema.departmentSelections)
      .values({ userId, departmentSlugs })
      .onConflictDoUpdate({
        target: schema.departmentSelections.userId,
        set: { departmentSlugs, selectedAt: new Date() },
      })
      .returning();
    return {
      userId: row.userId,
      departmentSlugs: row.departmentSlugs,
      selectedAt: isoReq(row.selectedAt),
    } satisfies DepartmentSelection;
  }

  async getDepartmentSelection(userId: string) {
    const [row] = await this.db
      .select()
      .from(schema.departmentSelections)
      .where(eq(schema.departmentSelections.userId, userId))
      .limit(1);
    return row
      ? ({
          userId: row.userId,
          departmentSlugs: row.departmentSlugs,
          selectedAt: isoReq(row.selectedAt),
        } satisfies DepartmentSelection)
      : null;
  }

  // --- sessions -----------------------------------------------------------

  private sessionSelection() {
    return this.db
      .select({
        id: schema.projectSessions.id,
        userId: schema.projectSessions.userId,
        status: schema.projectSessions.status,
        currentStepKey: schema.projectSessions.currentStepKey,
        startedAt: schema.projectSessions.startedAt,
        deadlineAt: schema.projectSessions.deadlineAt,
        completedAt: schema.projectSessions.completedAt,
        departmentSlug: schema.departments.slug,
        projectKey: schema.projects.key,
        scenarioKey: schema.scenarios.key,
        scenarioVersion: schema.scenarioVersions.version,
      })
      .from(schema.projectSessions)
      .innerJoin(
        schema.departments,
        eq(schema.departments.id, schema.projectSessions.departmentId),
      )
      .innerJoin(
        schema.projects,
        eq(schema.projects.id, schema.projectSessions.projectId),
      )
      .innerJoin(
        schema.scenarioVersions,
        eq(schema.scenarioVersions.id, schema.projectSessions.scenarioVersionId),
      )
      .innerJoin(
        schema.scenarios,
        eq(schema.scenarios.id, schema.scenarioVersions.scenarioId),
      );
  }

  private toSession(row: {
    id: string;
    userId: string;
    status: string;
    currentStepKey: string | null;
    startedAt: Date;
    deadlineAt: Date;
    completedAt: Date | null;
    departmentSlug: string;
    projectKey: string;
    scenarioKey: string;
    scenarioVersion: number;
  }): ProjectSession {
    return {
      id: row.id,
      userId: row.userId,
      departmentSlug: row.departmentSlug,
      projectKey: row.projectKey,
      scenarioKey: row.scenarioKey,
      scenarioVersion: row.scenarioVersion,
      status: row.status as SessionStatus,
      currentStepKey: row.currentStepKey,
      startedAt: isoReq(row.startedAt),
      deadlineAt: isoReq(row.deadlineAt),
      completedAt: iso(row.completedAt),
    };
  }

  async createSession(input: CreateSessionInput): Promise<ProjectSession> {
    const [department] = await this.db
      .select({ id: schema.departments.id })
      .from(schema.departments)
      .where(eq(schema.departments.slug, input.departmentSlug))
      .limit(1);
    const [project] = await this.db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.key, input.projectKey))
      .limit(1);
    const [version] = await this.db
      .select({ id: schema.scenarioVersions.id })
      .from(schema.scenarioVersions)
      .innerJoin(
        schema.scenarios,
        eq(schema.scenarios.id, schema.scenarioVersions.scenarioId),
      )
      .where(
        and(
          eq(schema.scenarios.key, input.scenarioKey),
          eq(schema.scenarioVersions.version, input.scenarioVersion),
        ),
      )
      .limit(1);

    if (!department || !project || !version) {
      throw new Error(
        `Scenario content is not seeded for ${input.scenarioKey} v${input.scenarioVersion}. Run \`npm run db:seed\`.`,
      );
    }

    const startedAt = new Date();
    const [row] = await this.db
      .insert(schema.projectSessions)
      .values({
        userId: input.userId,
        departmentId: department.id,
        projectId: project.id,
        scenarioVersionId: version.id,
        status: 'in_progress',
        currentStepKey: input.initialStepKey,
        startedAt,
        deadlineAt: new Date(startedAt.getTime() + input.deadlineHours * 3_600_000),
      })
      .returning({ id: schema.projectSessions.id });

    const session = await this.getSession(row.id);
    if (!session) throw new Error('Failed to read back the created session');
    return session;
  }

  async getSession(sessionId: string): Promise<ProjectSession | null> {
    const [row] = await this.sessionSelection()
      .where(eq(schema.projectSessions.id, sessionId))
      .limit(1);
    return row ? this.toSession(row) : null;
  }

  async listSessionsForUser(userId: string): Promise<ProjectSession[]> {
    const rows = await this.sessionSelection()
      .where(eq(schema.projectSessions.userId, userId))
      .orderBy(desc(schema.projectSessions.startedAt));
    return rows.map((row) => this.toSession(row));
  }

  async findActiveSession(userId: string, departmentSlug: string) {
    const [row] = await this.sessionSelection()
      .where(
        and(
          eq(schema.projectSessions.userId, userId),
          eq(schema.departments.slug, departmentSlug),
          ne(schema.projectSessions.status, 'expired'),
        ),
      )
      .orderBy(desc(schema.projectSessions.startedAt))
      .limit(1);
    return row ? this.toSession(row) : null;
  }

  async updateSession(
    sessionId: string,
    patch: Partial<Pick<ProjectSession, 'status' | 'currentStepKey' | 'completedAt'>>,
  ): Promise<ProjectSession> {
    await this.db
      .update(schema.projectSessions)
      .set({
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.currentStepKey !== undefined
          ? { currentStepKey: patch.currentStepKey }
          : {}),
        ...(patch.completedAt !== undefined
          ? { completedAt: patch.completedAt ? new Date(patch.completedAt) : null }
          : {}),
      })
      .where(eq(schema.projectSessions.id, sessionId));
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    return session;
  }

  // --- step progress ------------------------------------------------------

  async listStepProgress(sessionId: string): Promise<StepProgress[]> {
    const rows = await this.db
      .select()
      .from(schema.stepProgress)
      .where(eq(schema.stepProgress.sessionId, sessionId));
    return rows.map((row) => ({
      sessionId: row.sessionId,
      stepKey: row.stepKey,
      status: row.status as StepStatus,
      startedAt: iso(row.startedAt),
      completedAt: iso(row.completedAt),
    }));
  }

  async upsertStepProgress(
    sessionId: string,
    stepKey: string,
    patch: { status?: StepStatus; startedAt?: string | null; completedAt?: string | null },
  ): Promise<StepProgress> {
    const set = {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.startedAt !== undefined
        ? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null }
        : {}),
      ...(patch.completedAt !== undefined
        ? { completedAt: patch.completedAt ? new Date(patch.completedAt) : null }
        : {}),
    };
    const [row] = await this.db
      .insert(schema.stepProgress)
      .values({ sessionId, stepKey, status: patch.status ?? 'locked', ...set })
      .onConflictDoUpdate({
        target: [schema.stepProgress.sessionId, schema.stepProgress.stepKey],
        set,
      })
      .returning();
    return {
      sessionId: row.sessionId,
      stepKey: row.stepKey,
      status: row.status as StepStatus,
      startedAt: iso(row.startedAt),
      completedAt: iso(row.completedAt),
    };
  }

  // --- answers ------------------------------------------------------------

  private toAnswer(row: typeof schema.taskAnswers.$inferSelect): TaskAnswer {
    return {
      sessionId: row.sessionId,
      taskKey: row.taskKey,
      value: row.value,
      status: row.status === 'submitted' ? 'submitted' : 'draft',
      version: row.version,
      updatedAt: isoReq(row.updatedAt),
      submittedAt: iso(row.submittedAt),
    };
  }

  async listAnswers(sessionId: string): Promise<TaskAnswer[]> {
    const rows = await this.db
      .select()
      .from(schema.taskAnswers)
      .where(eq(schema.taskAnswers.sessionId, sessionId));
    return rows.map((row) => this.toAnswer(row));
  }

  async getAnswer(sessionId: string, taskKey: string) {
    const [row] = await this.db
      .select()
      .from(schema.taskAnswers)
      .where(
        and(
          eq(schema.taskAnswers.sessionId, sessionId),
          eq(schema.taskAnswers.taskKey, taskKey),
        ),
      )
      .limit(1);
    return row ? this.toAnswer(row) : null;
  }

  async saveAnswer(input: SaveAnswerInput): Promise<TaskAnswer> {
    const existing = await this.getAnswer(input.sessionId, input.taskKey);
    const timestamp = new Date();
    // Order-insensitive: jsonb reorders keys, so a plain string compare would
    // report a change on every save.
    const changed = !existing || !deepEquals(existing.value, input.value);
    const version = existing ? existing.version + (changed ? 1 : 0) : 1;

    const [row] = await this.db
      .insert(schema.taskAnswers)
      .values({
        sessionId: input.sessionId,
        taskKey: input.taskKey,
        value: input.value,
        status: input.status,
        version,
        updatedAt: timestamp,
        submittedAt: input.status === 'submitted' ? timestamp : null,
      })
      .onConflictDoUpdate({
        target: [schema.taskAnswers.sessionId, schema.taskAnswers.taskKey],
        set: {
          value: input.value,
          version,
          updatedAt: timestamp,
          // A submitted answer never reverts to draft via autosave.
          ...(input.status === 'submitted'
            ? { status: 'submitted', submittedAt: timestamp }
            : {}),
        },
      })
      .returning();

    if (changed) {
      await this.db.insert(schema.taskAnswerRevisions).values({
        sessionId: input.sessionId,
        taskKey: input.taskKey,
        version,
        previousValue: existing?.value ?? null,
        value: input.value,
        createdAt: timestamp,
      });
    }

    return this.toAnswer(row);
  }

  async listRevisions(sessionId: string, taskKey?: string): Promise<TaskAnswerRevision[]> {
    const where = taskKey
      ? and(
          eq(schema.taskAnswerRevisions.sessionId, sessionId),
          eq(schema.taskAnswerRevisions.taskKey, taskKey),
        )
      : eq(schema.taskAnswerRevisions.sessionId, sessionId);
    const rows = await this.db
      .select()
      .from(schema.taskAnswerRevisions)
      .where(where)
      .orderBy(asc(schema.taskAnswerRevisions.createdAt));
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      taskKey: row.taskKey,
      version: row.version,
      previousValue: row.previousValue ?? null,
      value: row.value,
      createdAt: isoReq(row.createdAt),
    }));
  }

  // --- submissions --------------------------------------------------------

  async createSubmission(input: {
    sessionId: string;
    taskKey: string;
    title: string;
    snapshot: Record<string, unknown>;
  }): Promise<Submission> {
    const [row] = await this.db.insert(schema.submissions).values(input).returning();
    return {
      id: row.id,
      sessionId: row.sessionId,
      taskKey: row.taskKey,
      title: row.title,
      snapshot: row.snapshot,
      createdAt: isoReq(row.createdAt),
    };
  }

  async listSubmissions(sessionId: string): Promise<Submission[]> {
    const rows = await this.db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.sessionId, sessionId))
      .orderBy(asc(schema.submissions.createdAt));
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      taskKey: row.taskKey,
      title: row.title,
      snapshot: row.snapshot,
      createdAt: isoReq(row.createdAt),
    }));
  }

  // --- AI conversations ---------------------------------------------------

  private toConversation(
    row: typeof schema.aiConversations.$inferSelect,
  ): AiConversation {
    return {
      id: row.id,
      sessionId: row.sessionId,
      personaKey: row.personaKey,
      stepKey: row.stepKey,
      status: row.status === 'ended' ? 'ended' : 'open',
      revealedFactIds: row.revealedFactIds,
      startedAt: isoReq(row.startedAt),
      endedAt: iso(row.endedAt),
    };
  }

  async getOrCreateConversation(input: {
    sessionId: string;
    personaKey: string;
    stepKey: string;
  }): Promise<AiConversation> {
    const [existing] = await this.db
      .select()
      .from(schema.aiConversations)
      .where(
        and(
          eq(schema.aiConversations.sessionId, input.sessionId),
          eq(schema.aiConversations.personaKey, input.personaKey),
          eq(schema.aiConversations.stepKey, input.stepKey),
        ),
      )
      .limit(1);
    if (existing) return this.toConversation(existing);

    const [row] = await this.db
      .insert(schema.aiConversations)
      .values({ ...input, status: 'open', revealedFactIds: [] })
      .returning();
    return this.toConversation(row);
  }

  async getConversation(conversationId: string) {
    const [row] = await this.db
      .select()
      .from(schema.aiConversations)
      .where(eq(schema.aiConversations.id, conversationId))
      .limit(1);
    return row ? this.toConversation(row) : null;
  }

  async listConversations(sessionId: string) {
    const rows = await this.db
      .select()
      .from(schema.aiConversations)
      .where(eq(schema.aiConversations.sessionId, sessionId));
    return rows.map((row) => this.toConversation(row));
  }

  async updateConversation(
    conversationId: string,
    patch: Partial<AiConversation> & { state?: Record<string, unknown> },
  ): Promise<AiConversation> {
    const [row] = await this.db
      .update(schema.aiConversations)
      .set({
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.revealedFactIds ? { revealedFactIds: patch.revealedFactIds } : {}),
        ...(patch.state ? { state: patch.state } : {}),
        ...(patch.endedAt !== undefined
          ? { endedAt: patch.endedAt ? new Date(patch.endedAt) : null }
          : {}),
      })
      .where(eq(schema.aiConversations.id, conversationId))
      .returning();
    if (!row) throw new Error(`Conversation ${conversationId} not found`);
    return this.toConversation(row);
  }

  async appendMessage(input: {
    conversationId: string;
    role: AiMessage['role'];
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<AiMessage> {
    const [row] = await this.db
      .insert(schema.aiMessages)
      .values({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        metadata: input.metadata ?? {},
      })
      .returning();
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role as AiMessage['role'],
      content: row.content,
      metadata: row.metadata,
      createdAt: isoReq(row.createdAt),
    };
  }

  async listMessages(conversationId: string): Promise<AiMessage[]> {
    const rows = await this.db
      .select()
      .from(schema.aiMessages)
      .where(eq(schema.aiMessages.conversationId, conversationId))
      .orderBy(asc(schema.aiMessages.createdAt));
    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      role: row.role as AiMessage['role'],
      content: row.content,
      metadata: row.metadata,
      createdAt: isoReq(row.createdAt),
    }));
  }

  // --- behavior events ----------------------------------------------------

  async recordEvent(input: RecordEventInput): Promise<BehaviorEvent> {
    const [row] = await this.db
      .insert(schema.behaviorEvents)
      .values({
        userId: input.userId,
        sessionId: input.sessionId,
        departmentSlug: input.departmentSlug ?? null,
        stepKey: input.stepKey ?? null,
        taskKey: input.taskKey ?? null,
        eventType: input.eventType,
        metadata: input.metadata ?? {},
      })
      .returning();
    return this.toEvent(row);
  }

  async listEvents(filter: EventFilter): Promise<BehaviorEvent[]> {
    const conditions = [
      filter.sessionId ? eq(schema.behaviorEvents.sessionId, filter.sessionId) : undefined,
      filter.userId ? eq(schema.behaviorEvents.userId, filter.userId) : undefined,
    ].filter(Boolean);

    const rows = await this.db
      .select()
      .from(schema.behaviorEvents)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(schema.behaviorEvents.occurredAt))
      .limit(filter.limit ?? 500);
    return rows.map((row) => this.toEvent(row));
  }

  private toEvent(row: typeof schema.behaviorEvents.$inferSelect): BehaviorEvent {
    return {
      id: row.id,
      userId: row.userId,
      sessionId: row.sessionId,
      departmentSlug: row.departmentSlug,
      stepKey: row.stepKey,
      taskKey: row.taskKey,
      eventType: row.eventType as BehaviorEventType,
      occurredAt: isoReq(row.occurredAt),
      metadata: row.metadata,
    };
  }
}
