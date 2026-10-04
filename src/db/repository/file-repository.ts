import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '@/lib/env';
import { deepEquals } from '@/lib/stable-json';
import type {
  AiConversation,
  AiMessage,
  BehaviorEvent,
  DepartmentSelection,
  PreSurvey,
  ProjectSession,
  StepProgress,
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

type FileShape = {
  users: User[];
  preSurveys: PreSurvey[];
  departmentSelections: DepartmentSelection[];
  sessions: ProjectSession[];
  stepProgress: StepProgress[];
  answers: TaskAnswer[];
  revisions: TaskAnswerRevision[];
  submissions: Submission[];
  conversations: (AiConversation & { state: Record<string, unknown> })[];
  messages: AiMessage[];
  events: BehaviorEvent[];
};

const EMPTY: FileShape = {
  users: [],
  preSurveys: [],
  departmentSelections: [],
  sessions: [],
  stepProgress: [],
  answers: [],
  revisions: [],
  submissions: [],
  conversations: [],
  messages: [],
  events: [],
};

const now = () => new Date().toISOString();

/**
 * JSON-file persistence for local development without a database.
 *
 * It is deliberately simple but genuinely durable across server restarts, so
 * "resume the session after a refresh" works before Neon is configured.
 * Writes are serialised through a promise chain and committed atomically.
 */
export class FileRepository implements XPassRepository {
  readonly mode: 'file' | 'memory';

  private readonly filePath: string;
  /** When true nothing is written to disk — the cache IS the database. */
  private readonly ephemeral: boolean;
  private cache: FileShape | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private warnedAboutDisk = false;

  constructor(dataDir = env.dataDir, ephemeral = env.persistenceMode === 'memory') {
    this.filePath = path.resolve(process.cwd(), dataDir, 'x-pass-dev-db.json');
    this.ephemeral = ephemeral;
    this.mode = ephemeral ? 'memory' : 'file';
  }

  private async load(): Promise<FileShape> {
    if (this.cache) return this.cache;
    if (this.ephemeral) {
      this.cache = structuredClone(EMPTY);
      return this.cache;
    }
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<FileShape>;
      this.cache = { ...structuredClone(EMPTY), ...parsed };
    } catch {
      this.cache = structuredClone(EMPTY);
    }
    return this.cache;
  }

  private async flush(data: FileShape): Promise<void> {
    if (this.ephemeral) return;
    try {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.${randomUUID()}.tmp`;
      await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      await rename(tmp, this.filePath);
    } catch (error) {
      // A read-only filesystem must not take the student's session down with
      // it: keep serving from the in-memory cache and say so once.
      if (!this.warnedAboutDisk) {
        this.warnedAboutDisk = true;
        console.warn(
          '[persistence] cannot write to disk, continuing in memory only. ' +
            'Set DATABASE_URL to persist anything.',
          error,
        );
      }
    }
  }

  /**
   * Serialises read-modify-write cycles so concurrent requests cannot interleave.
   *
   * Results are cloned on the way out: handing back a live reference into the
   * cache would let a caller mutate the store by accident, and would silently
   * break any "compare the value before and after the write" logic, because
   * both sides would be the same object.
   */
  private mutate<T>(fn: (data: FileShape) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.load();
      const result = await fn(data);
      await this.flush(data);
      return structuredClone(result);
    });
    // Keep the chain alive even if one mutation rejects.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async read<T>(fn: (data: FileShape) => T): Promise<T> {
    await this.queue.catch(() => undefined);
    return structuredClone(fn(await this.load()));
  }

  // --- identity -----------------------------------------------------------

  async findUserByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return this.read(
      (d) => d.users.find((u) => u.email === normalized) ?? null,
    );
  }

  async getUser(id: string) {
    return this.read((d) => d.users.find((u) => u.id === id) ?? null);
  }

  async createUser(input: { email: string; displayName: string }) {
    return this.mutate((d) => {
      const normalized = input.email.trim().toLowerCase();
      const existing = d.users.find((u) => u.email === normalized);
      if (existing) return existing;
      const user: User = {
        id: randomUUID(),
        email: normalized,
        displayName: input.displayName,
        role: 'student',
        createdAt: now(),
      };
      d.users.push(user);
      return user;
    });
  }

  // --- onboarding ---------------------------------------------------------

  async savePreSurvey(userId: string, answers: Record<string, unknown>) {
    return this.mutate((d) => {
      const record: PreSurvey = { userId, answers, submittedAt: now() };
      const idx = d.preSurveys.findIndex((p) => p.userId === userId);
      if (idx >= 0) d.preSurveys[idx] = record;
      else d.preSurveys.push(record);
      return record;
    });
  }

  async getPreSurvey(userId: string) {
    return this.read((d) => d.preSurveys.find((p) => p.userId === userId) ?? null);
  }

  async saveDepartmentSelection(userId: string, departmentSlugs: string[]) {
    return this.mutate((d) => {
      const record: DepartmentSelection = {
        userId,
        departmentSlugs,
        selectedAt: now(),
      };
      const idx = d.departmentSelections.findIndex((s) => s.userId === userId);
      if (idx >= 0) d.departmentSelections[idx] = record;
      else d.departmentSelections.push(record);
      return record;
    });
  }

  async getDepartmentSelection(userId: string) {
    return this.read(
      (d) => d.departmentSelections.find((s) => s.userId === userId) ?? null,
    );
  }

  // --- sessions -----------------------------------------------------------

  async createSession(input: CreateSessionInput) {
    return this.mutate((d) => {
      const startedAt = new Date();
      const session: ProjectSession = {
        id: randomUUID(),
        userId: input.userId,
        departmentSlug: input.departmentSlug,
        projectKey: input.projectKey,
        scenarioKey: input.scenarioKey,
        scenarioVersion: input.scenarioVersion,
        status: 'in_progress',
        currentStepKey: input.initialStepKey,
        startedAt: startedAt.toISOString(),
        deadlineAt: new Date(
          startedAt.getTime() + input.deadlineHours * 3_600_000,
        ).toISOString(),
        completedAt: null,
      };
      d.sessions.push(session);
      return session;
    });
  }

  async getSession(sessionId: string) {
    return this.read((d) => d.sessions.find((s) => s.id === sessionId) ?? null);
  }

  async listSessionsForUser(userId: string) {
    return this.read((d) => d.sessions.filter((s) => s.userId === userId));
  }

  async findActiveSession(userId: string, departmentSlug: string) {
    return this.read(
      (d) =>
        d.sessions.find(
          (s) =>
            s.userId === userId &&
            s.departmentSlug === departmentSlug &&
            s.status !== 'expired',
        ) ?? null,
    );
  }

  async updateSession(sessionId: string, patch: Partial<ProjectSession>) {
    return this.mutate((d) => {
      const session = d.sessions.find((s) => s.id === sessionId);
      if (!session) throw new Error(`Session ${sessionId} not found`);
      Object.assign(session, patch);
      return session;
    });
  }

  // --- step progress ------------------------------------------------------

  async listStepProgress(sessionId: string) {
    return this.read((d) => d.stepProgress.filter((p) => p.sessionId === sessionId));
  }

  async upsertStepProgress(
    sessionId: string,
    stepKey: string,
    patch: Partial<StepProgress>,
  ) {
    return this.mutate((d) => {
      let record = d.stepProgress.find(
        (p) => p.sessionId === sessionId && p.stepKey === stepKey,
      );
      if (!record) {
        record = {
          sessionId,
          stepKey,
          status: 'locked',
          startedAt: null,
          completedAt: null,
        };
        d.stepProgress.push(record);
      }
      Object.assign(record, patch);
      return record;
    });
  }

  // --- answers ------------------------------------------------------------

  async listAnswers(sessionId: string) {
    return this.read((d) => d.answers.filter((a) => a.sessionId === sessionId));
  }

  async getAnswer(sessionId: string, taskKey: string) {
    return this.read(
      (d) =>
        d.answers.find(
          (a) => a.sessionId === sessionId && a.taskKey === taskKey,
        ) ?? null,
    );
  }

  async saveAnswer(input: SaveAnswerInput) {
    return this.mutate((d) => {
      const existing = d.answers.find(
        (a) => a.sessionId === input.sessionId && a.taskKey === input.taskKey,
      );
      const timestamp = now();

      if (!existing) {
        const answer: TaskAnswer = {
          sessionId: input.sessionId,
          taskKey: input.taskKey,
          value: input.value,
          status: input.status,
          version: 1,
          updatedAt: timestamp,
          submittedAt: input.status === 'submitted' ? timestamp : null,
        };
        d.answers.push(answer);
        d.revisions.push({
          id: randomUUID(),
          sessionId: input.sessionId,
          taskKey: input.taskKey,
          version: 1,
          previousValue: null,
          value: input.value,
          createdAt: timestamp,
        });
        return answer;
      }

      const changed = !deepEquals(existing.value, input.value);
      if (changed) {
        const previousValue = existing.value;
        existing.version += 1;
        existing.value = input.value;
        d.revisions.push({
          id: randomUUID(),
          sessionId: input.sessionId,
          taskKey: input.taskKey,
          version: existing.version,
          previousValue,
          value: input.value,
          createdAt: timestamp,
        });
      }
      existing.updatedAt = timestamp;
      if (input.status === 'submitted') {
        existing.status = 'submitted';
        existing.submittedAt = timestamp;
      }
      return existing;
    });
  }

  async listRevisions(sessionId: string, taskKey?: string) {
    return this.read((d) =>
      d.revisions.filter(
        (r) => r.sessionId === sessionId && (!taskKey || r.taskKey === taskKey),
      ),
    );
  }

  // --- submissions --------------------------------------------------------

  async createSubmission(input: {
    sessionId: string;
    taskKey: string;
    title: string;
    snapshot: Record<string, unknown>;
  }) {
    return this.mutate((d) => {
      const submission: Submission = {
        id: randomUUID(),
        ...input,
        createdAt: now(),
      };
      d.submissions.push(submission);
      return submission;
    });
  }

  async listSubmissions(sessionId: string) {
    return this.read((d) => d.submissions.filter((s) => s.sessionId === sessionId));
  }

  // --- AI conversations ---------------------------------------------------

  async getOrCreateConversation(input: {
    sessionId: string;
    personaKey: string;
    stepKey: string;
  }) {
    return this.mutate((d) => {
      const existing = d.conversations.find(
        (c) =>
          c.sessionId === input.sessionId &&
          c.personaKey === input.personaKey &&
          c.stepKey === input.stepKey,
      );
      if (existing) return existing;
      const conversation = {
        id: randomUUID(),
        ...input,
        status: 'open' as const,
        revealedFactIds: [] as string[],
        state: {} as Record<string, unknown>,
        startedAt: now(),
        endedAt: null,
      };
      d.conversations.push(conversation);
      return conversation;
    });
  }

  async getConversation(conversationId: string) {
    return this.read(
      (d) => d.conversations.find((c) => c.id === conversationId) ?? null,
    );
  }

  async listConversations(sessionId: string) {
    return this.read((d) => d.conversations.filter((c) => c.sessionId === sessionId));
  }

  async updateConversation(
    conversationId: string,
    patch: Partial<AiConversation> & { state?: Record<string, unknown> },
  ) {
    return this.mutate((d) => {
      const conversation = d.conversations.find((c) => c.id === conversationId);
      if (!conversation) throw new Error(`Conversation ${conversationId} not found`);
      Object.assign(conversation, patch);
      return conversation;
    });
  }

  async appendMessage(input: {
    conversationId: string;
    role: AiMessage['role'];
    content: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.mutate((d) => {
      const message: AiMessage = {
        id: randomUUID(),
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        metadata: input.metadata ?? {},
        createdAt: now(),
      };
      d.messages.push(message);
      return message;
    });
  }

  async listMessages(conversationId: string) {
    return this.read((d) =>
      d.messages.filter((m) => m.conversationId === conversationId),
    );
  }

  // --- behavior events ----------------------------------------------------

  async recordEvent(input: RecordEventInput) {
    return this.mutate((d) => {
      const event: BehaviorEvent = {
        id: randomUUID(),
        userId: input.userId,
        sessionId: input.sessionId,
        departmentSlug: input.departmentSlug ?? null,
        stepKey: input.stepKey ?? null,
        taskKey: input.taskKey ?? null,
        eventType: input.eventType,
        occurredAt: now(),
        metadata: input.metadata ?? {},
      };
      d.events.push(event);
      return event;
    });
  }

  async listEvents(filter: EventFilter) {
    return this.read((d) => {
      const rows = d.events
        .filter((e) => !filter.sessionId || e.sessionId === filter.sessionId)
        .filter((e) => !filter.userId || e.userId === filter.userId)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      return filter.limit ? rows.slice(-filter.limit) : rows;
    });
  }
}
