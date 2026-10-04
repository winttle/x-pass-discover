import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    role: text('role').notNull().default('student'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);

export const companies = pgTable(
  'companies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    industry: text('industry').notNull(),
    profile: text('profile').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('companies_slug_idx').on(table.slug)],
);

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    tagline: text('tagline').notNull().default(''),
    description: text('description').notNull().default(''),
    officeZoneKey: text('office_zone_key').notNull().default(''),
    accentColor: text('accent_color').notNull().default('#2563eb'),
    status: text('status').notNull().default('coming_soon'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('departments_slug_idx').on(table.slug)],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    /** Spec sheet values (size, protein, price, unit economics, ...). */
    attributes: jsonb('attributes').$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [uniqueIndex('products_slug_idx').on(table.slug)],
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'cascade' }),
    /**
     * NULLABLE BY DESIGN.
     * Product Management starts with no product, and Strategy has no assigned
     * product at all. Do not add a NOT NULL constraint here.
     */
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    mission: text('mission').notNull().default(''),
    studentRole: text('student_role').notNull().default(''),
    coreQuestion: text('core_question').notNull().default(''),
    finalOutput: text('final_output').notNull().default(''),
  },
  (table) => [uniqueIndex('projects_key_idx').on(table.key)],
);
