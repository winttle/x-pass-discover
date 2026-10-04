import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { AnswerValue } from '@/types/runtime';
import { departments, projects, users } from './identity';
import { scenarioSteps, scenarioVersions, tasks } from './scenario';

/** One student's attempt at one scenario version. */
export const projectSessions = pgTable(
  'project_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'cascade' }),
    /** Pinned at creation so later admin edits cannot mutate a live session. */
    scenarioVersionId: uuid('scenario_version_id')
      .notNull()
      .references(() => scenarioVersions.id),
    status: text('status').notNull().default('not_started'),
    currentStepKey: text('current_step_key'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('project_sessions_user_idx').on(table.userId)],
);

export const stepProgress = pgTable(
  'step_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => projectSessions.id, { onDelete: 'cascade' }),
    stepId: uuid('step_id').references(() => scenarioSteps.id, {
      onDelete: 'cascade',
    }),
    stepKey: text('step_key').notNull(),
    status: text('status').notNull().default('locked'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('step_progress_unique_idx').on(table.sessionId, table.stepKey),
  ],
);

export const taskAnswers = pgTable(
  'task_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => projectSessions.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    taskKey: text('task_key').notNull(),
    value: jsonb('value').$type<AnswerValue>().notNull().default({}),
    status: text('status').notNull().default('draft'),
    version: integer('version').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('task_answers_unique_idx').on(table.sessionId, table.taskKey),
  ],
);

/**
 * Revision history. Revising a decision after new information is first-class
 * evidence, so earlier values are preserved rather than overwritten.
 */
export const taskAnswerRevisions = pgTable(
  'task_answer_revisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => projectSessions.id, { onDelete: 'cascade' }),
    taskKey: text('task_key').notNull(),
    version: integer('version').notNull(),
    previousValue: jsonb('previous_value').$type<AnswerValue | null>(),
    value: jsonb('value').$type<AnswerValue>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('task_answer_revisions_session_idx').on(table.sessionId, table.taskKey),
  ],
);

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => projectSessions.id, { onDelete: 'cascade' }),
    taskKey: text('task_key').notNull(),
    title: text('title').notNull(),
    /** Immutable snapshot of the work that produced this submission. */
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('submissions_session_idx').on(table.sessionId)],
);

export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => projectSessions.id, { onDelete: 'cascade' }),
    personaKey: text('persona_key').notNull(),
    stepKey: text('step_key').notNull(),
    status: text('status').notNull().default('open'),
    /** Server-side disclosure ledger. Drives "already discovered" logic. */
    revealedFactIds: jsonb('revealed_fact_ids').$type<string[]>().notNull().default([]),
    /** Structured negotiation state (final agreed package, etc.). */
    state: jsonb('state').$type<Record<string, unknown>>().notNull().default({}),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('ai_conversations_unique_idx').on(
      table.sessionId,
      table.personaKey,
      table.stepKey,
    ),
  ],
);

export const aiMessages = pgTable(
  'ai_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => aiConversations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('ai_messages_conversation_idx').on(table.conversationId)],
);

/**
 * Generic behavior event log. These are contextual evidence only — counts and
 * durations must never be converted directly into a skill score.
 */
export const behaviorEvents = pgTable(
  'behavior_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => projectSessions.id, {
      onDelete: 'cascade',
    }),
    departmentSlug: text('department_slug'),
    stepKey: text('step_key'),
    taskKey: text('task_key'),
    eventType: text('event_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    index('behavior_events_session_idx').on(table.sessionId, table.occurredAt),
    index('behavior_events_user_idx').on(table.userId, table.occurredAt),
  ],
);

export const preSurveys = pgTable(
  'pre_surveys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    answers: jsonb('answers').$type<Record<string, unknown>>().notNull().default({}),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('pre_surveys_user_idx').on(table.userId)],
);

export const postSurveys = pgTable(
  'post_surveys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    departmentSlug: text('department_slug').notNull(),
    answers: jsonb('answers').$type<Record<string, unknown>>().notNull().default({}),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('post_surveys_unique_idx').on(table.userId, table.departmentSlug),
  ],
);

export const departmentSelections = pgTable(
  'department_selections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    departmentSlugs: jsonb('department_slugs').$type<string[]>().notNull().default([]),
    selectedAt: timestamp('selected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('department_selections_user_idx').on(table.userId)],
);
