import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  ScenarioEventPayload,
  StepCompletionRule,
  TaskCompletionRule,
  TaskField,
  UnlockRule,
} from '@/types/scenario';
import { departments, projects } from './identity';

export const scenarios = pgTable(
  'scenarios',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    /** Points at the version new sessions should snapshot. */
    currentVersion: integer('current_version'),
  },
  (table) => [uniqueIndex('scenarios_key_idx').on(table.key)],
);

/**
 * Scenario content is versioned so editing admin content never mutates a
 * session that is already running: a session pins `scenario_version_id`.
 */
export const scenarioVersions = pgTable(
  'scenario_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scenarioId: uuid('scenario_id')
      .notNull()
      .references(() => scenarios.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: text('status').notNull().default('draft'),
    title: text('title').notNull(),
    studentRole: text('student_role').notNull().default(''),
    mission: text('mission').notNull().default(''),
    finalOutputTitle: text('final_output_title').notNull().default(''),
    deadlineHours: integer('deadline_hours').notNull().default(24),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('scenario_versions_unique_idx').on(
      table.scenarioId,
      table.version,
    ),
  ],
);

export const scenarioSteps = pgTable(
  'scenario_steps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scenarioVersionId: uuid('scenario_version_id')
      .notNull()
      .references(() => scenarioVersions.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    stepType: text('step_type').notNull(),
    summary: text('summary').notNull().default(''),
    instructions: text('instructions').notNull().default(''),
    estimatedMinutes: integer('estimated_minutes'),
    sortOrder: integer('sort_order').notNull(),
    officeZoneKey: text('office_zone_key'),
    unlockRule: jsonb('unlock_rule').$type<UnlockRule>().notNull(),
    completionRule: jsonb('completion_rule').$type<StepCompletionRule>().notNull(),
    eventPayload: jsonb('event_payload').$type<ScenarioEventPayload | null>(),
  },
  (table) => [
    uniqueIndex('scenario_steps_unique_idx').on(
      table.scenarioVersionId,
      table.key,
    ),
  ],
);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stepId: uuid('step_id')
      .notNull()
      .references(() => scenarioSteps.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    instructions: text('instructions').notNull().default(''),
    kind: text('kind').notNull(),
    required: boolean('required').notNull().default(true),
    personaKey: text('persona_key'),
    prefillFromTaskKey: text('prefill_from_task_key'),
    sortOrder: integer('sort_order').notNull().default(0),
    /** Configurable form definition — avoids one React component per step. */
    fields: jsonb('fields').$type<TaskField[]>().notNull().default([]),
    referenceTaskKeys: jsonb('reference_task_keys').$type<string[]>().notNull().default([]),
    guardrailKeys: jsonb('guardrail_keys').$type<string[]>().notNull().default([]),
    completionRule: jsonb('completion_rule').$type<TaskCompletionRule>().notNull(),
  },
  (table) => [uniqueIndex('tasks_unique_idx').on(table.stepId, table.key)],
);

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scenarioVersionId: uuid('scenario_version_id').references(
      () => scenarioVersions.id,
      { onDelete: 'cascade' },
    ),
    departmentId: uuid('department_id').references(() => departments.id, {
      onDelete: 'cascade',
    }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    resourceType: text('resource_type').notNull(),
    /** Markdown body, table payload, or external file reference. */
    body: jsonb('body').$type<Record<string, unknown>>().notNull().default({}),
    fileUrl: text('file_url'),
    visibility: text('visibility').notNull().default('scenario'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('resources_key_idx').on(table.key)],
);

export const stepResources = pgTable(
  'step_resources',
  {
    stepId: uuid('step_id')
      .notNull()
      .references(() => scenarioSteps.id, { onDelete: 'cascade' }),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.stepId, table.resourceId] })],
);

export const aiPersonas = pgTable(
  'ai_personas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scenarioVersionId: uuid('scenario_version_id').references(
      () => scenarioVersions.id,
      { onDelete: 'cascade' },
    ),
    key: text('key').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    organization: text('organization').notNull().default(''),
    avatarColor: text('avatar_color').notNull().default('#2563eb'),
    /** Client-safe. */
    visibleContext: text('visible_context').notNull().default(''),
    openingMessage: text('opening_message').notNull().default(''),
    /** SERVER-ONLY. Never select these columns into a client payload. */
    systemPrompt: text('system_prompt').notNull().default(''),
    conversationRules: text('conversation_rules').notNull().default(''),
  },
  (table) => [uniqueIndex('ai_personas_key_idx').on(table.key)],
);

/**
 * SERVER-ONLY table. Hidden facts are the core of the discovery mechanic and
 * must never reach the browser except as content the buyer actually said.
 */
export const personaFacts = pgTable(
  'persona_facts',
  {
    id: text('id').primaryKey(),
    personaKey: text('persona_key').notNull(),
    label: text('label').notNull(),
    content: text('content').notNull(),
    visibility: text('visibility').notNull().default('hidden'),
    disclosureRule: text('disclosure_rule').notNull().default(''),
    triggerTopics: jsonb('trigger_topics').$type<string[]>().notNull().default([]),
  },
);
