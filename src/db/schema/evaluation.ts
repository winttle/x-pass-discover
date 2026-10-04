/**
 * Evaluation / career-report tables.
 *
 * These are structural placeholders for the next milestone. The shape matters
 * now because two product rules must never be violated later:
 *   1. LIKE and SKILL FIT are separate data, never merged into one score.
 *   2. A rating may be `NE` (Not Enough Evidence) — absence of evidence is a
 *      real outcome, not a zero.
 */
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
import { departments, users } from './identity';
import { scenarioVersions } from './scenario';
import { projectSessions } from './runtime';

export const rubrics = pgTable(
  'rubrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scenarioVersionId: uuid('scenario_version_id').references(
      () => scenarioVersions.id,
      { onDelete: 'cascade' },
    ),
    key: text('key').notNull(),
    title: text('title').notNull(),
  },
  (table) => [uniqueIndex('rubrics_key_idx').on(table.key)],
);

export const rubricDimensions = pgTable(
  'rubric_dimensions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rubricId: uuid('rubric_id')
      .notNull()
      .references(() => rubrics.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    /** Behaviorally Anchored Rating Scale anchors, 1-5. */
    barsAnchors: jsonb('bars_anchors').$type<Record<string, string>>().notNull().default({}),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    uniqueIndex('rubric_dimensions_unique_idx').on(table.rubricId, table.key),
  ],
);

/** Extracted evidence, kept separate from any rating decision. */
export const evaluationEvidence = pgTable(
  'evaluation_evidence',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => projectSessions.id, { onDelete: 'cascade' }),
    dimensionKey: text('dimension_key').notNull(),
    sourceType: text('source_type').notNull(),
    sourceRef: text('source_ref').notNull().default(''),
    excerpt: text('excerpt').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('evaluation_evidence_session_idx').on(table.sessionId)],
);

export const evaluations = pgTable(
  'evaluations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => projectSessions.id, { onDelete: 'cascade' }),
    dimensionKey: text('dimension_key').notNull(),
    /** 1-5, or NULL when `rating_status` is 'NE'. */
    rating: integer('rating'),
    ratingStatus: text('rating_status').notNull().default('NE'),
    confidence: text('confidence').notNull().default('low'),
    rationale: text('rationale').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('evaluations_unique_idx').on(table.sessionId, table.dimensionKey),
  ],
);

/** Self-reported preference. Deliberately a different table from evaluations. */
export const likeScores = pgTable(
  'like_scores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => projectSessions.id, {
      onDelete: 'set null',
    }),
    score: integer('score').notNull(),
    source: text('source').notNull().default('post_survey'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('like_scores_unique_idx').on(table.userId, table.departmentId),
  ],
);

export const careerReports = pgTable(
  'career_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** { departments: [{ slug, like, skillFit, skillFitStatus }], ... } */
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    generatedAt: timestamp('generated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('career_reports_user_idx').on(table.userId)],
);
