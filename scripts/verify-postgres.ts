/**
 * Verifies the Neon/Drizzle code path against a real PostgreSQL engine without
 * needing a Neon account: boots an embedded Postgres (PGlite), applies the
 * generated migration, runs the seed, and drives DrizzleRepository through the
 * real scenario services.
 *
 *   npm run db:verify
 *
 * Useful in CI and before touching the schema. It does not replace a smoke test
 * against an actual Neon branch — Neon's serverless driver is not exercised
 * here — but it does prove the SQL, the schema and every query are correct.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';
import { DrizzleRepository } from '@/db/repository/drizzle-repository';

let failures = 0;
const check = (label: string, cond: unknown, detail = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✓' : '✗ FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const ROOT = process.cwd();

async function main() {
  console.log('=== booting embedded Postgres ===');
  const client = new PGlite();
  await client.waitReady;
  const db = drizzle(client, { schema });

  // Before the migration, this database is exactly what a deployment looks
  // like when DATABASE_URL is set and `db:migrate` was never run. The app has
  // to recognise that and say so, rather than forwarding PostgreSQL's
  // `relation "users" does not exist` to whoever is testing the deployment.
  console.log('\n=== an un-migrated database is recognised as such ===');
  const { isMissingSchemaError } = await import('@/lib/errors');
  let missingSchema: unknown = null;
  try {
    await new DrizzleRepository(db as never).findUserByEmail('nobody@example.com');
  } catch (error) {
    missingSchema = error;
  }
  check('a query against an empty database fails', missingSchema !== null);
  check('and is recognised as a missing schema', isMissingSchemaError(missingSchema));
  check('a genuine fault is not mistaken for one', !isMissingSchemaError(new Error('boom')));

  // The whole path, from the error PostgreSQL actually raised to the response
  // the browser actually receives.
  const { faultResponse } = await import('@/lib/api');
  const response = faultResponse(missingSchema, 'Sign-up failed. Please try again.');
  const body = (await response.json()) as { error: string; code?: string };
  check('the API answers 503, not a 400 that looks like bad input', response.status === 503);
  check('with a code the client can branch on', body.code === 'setup_required', body.code);
  check('and an instruction rather than a driver message', body.error.includes('db:migrate'));
  check(
    'the driver message is not forwarded to the browser',
    !body.error.includes('does not exist'),
    body.error,
  );

  console.log('\n=== applying generated migration ===');
  const dir = path.join(ROOT, 'drizzle');
  const file = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()[0];
  const sql = readFileSync(path.join(dir, file), 'utf8');
  for (const statement of sql.split('--> statement-breakpoint')) {
    const trimmed = statement.trim();
    if (trimmed) await client.exec(trimmed);
  }
  const tables = await client.query<{ count: number }>(
    `select count(*)::int as count from information_schema.tables where table_schema='public'`,
  );
  check(`migration applied (${file})`, tables.rows[0].count === 30, `${tables.rows[0].count} tables`);

  const nullable = await client.query<{ is_nullable: string }>(
    `select is_nullable from information_schema.columns where table_name='projects' and column_name='product_id'`,
  );
  check('projects.product_id is NULLABLE', nullable.rows[0].is_nullable === 'YES');

  // Point the global repository at this database before services load it.
  const repo = new DrizzleRepository(db as never);
  (globalThis as { __xPassRepository?: unknown }).__xPassRepository = repo;

  // Migrated but not seeded is the other half-finished deployment: sign-up
  // works, so nothing looks wrong until a student presses "Start bootcamp".
  console.log('\n=== a migrated-but-unseeded database says what is missing ===');
  const { SetupRequiredError } = await import('@/lib/errors');
  let unseeded: unknown = null;
  try {
    await repo.createSession({
      userId: '00000000-0000-0000-0000-000000000000',
      departmentSlug: 'sales',
      projectKey: 'sales',
      scenarioKey: 'sales-quickmart',
      scenarioVersion: 1,
      deadlineHours: 24,
      initialStepKey: 'sales-training',
    });
  } catch (error) {
    unseeded = error;
  }
  check('starting a bootcamp fails before the seed', unseeded !== null);
  check('and says so as a setup problem', unseeded instanceof SetupRequiredError);
  const unseededResponse = faultResponse(unseeded, 'Could not start the bootcamp.');
  const unseededBody = (await unseededResponse.json()) as { error: string; code?: string };
  check('answered as 503 setup_required', unseededResponse.status === 503 && unseededBody.code === 'setup_required');
  check('naming the command that fixes it', unseededBody.error.includes('db:seed'), unseededBody.error);

  console.log('\n=== seeding scenario content ===');
  const { seed } = await import('@/db/seed/run');
  await seed(db as never);

  const counts = async (table: string) =>
    (await client.query<{ c: number }>(`select count(*)::int as c from ${table}`)).rows[0].c;
  check('5 departments seeded', (await counts('departments')) === 5);
  check('5 projects seeded', (await counts('projects')) === 5);
  check('1 scenario version seeded', (await counts('scenario_versions')) === 1);
  check('10 scenario steps seeded', (await counts('scenario_steps')) === 10, `${await counts('scenario_steps')}`);
  check('tasks seeded', (await counts('tasks')) >= 12, `${await counts('tasks')}`);
  check('9 resources seeded', (await counts('resources')) === 9, `${await counts('resources')}`);
  check('2 personas seeded', (await counts('ai_personas')) === 2);
  check('persona facts seeded', (await counts('persona_facts')) === 7, `${await counts('persona_facts')}`);
  check('step_resources linked', (await counts('step_resources')) > 0);

  const nullProduct = await client.query<{ c: number }>(
    `select count(*)::int as c from projects where product_id is null`,
  );
  check('PM and Strategy projects stored with NULL product_id', nullProduct.rows[0].c === 2, `${nullProduct.rows[0].c}`);

  console.log('\n=== seed is idempotent ===');
  await seed(db as never);
  check('re-seed keeps 10 steps (no duplicates)', (await counts('scenario_steps')) === 10, `${await counts('scenario_steps')}`);
  check('re-seed keeps 5 departments', (await counts('departments')) === 5);

  console.log('\n=== exercising DrizzleRepository through the real services ===');
  const user = await repo.createUser({ email: 'pg@example.com', displayName: 'PG Student' });
  check('createUser creates', Boolean(user?.id));
  if (!user) throw new Error('createUser returned null on a fresh email');
  check('findUserByEmail round-trips', (await repo.findUserByEmail('pg@example.com'))?.id === user.id);
  // A taken address comes back as null rather than a second account or an
  // overwritten name — the sign-up form depends on being able to tell.
  const duplicate = await repo.createUser({
    email: 'PG@Example.com',
    displayName: 'Someone Else',
  });
  check('createUser refuses an email that already has an account', duplicate === null);
  check('the existing account is untouched', (await repo.getUser(user.id))?.displayName === 'PG Student');
  check('and there is still only one of it', (await counts('users')) === 1);

  await repo.savePreSurvey(user.id, { interest_sales: 5 });
  check('pre-survey upsert', (await repo.getPreSurvey(user.id))?.answers.interest_sales === 5);
  await repo.savePreSurvey(user.id, { interest_sales: 3 });
  check('pre-survey re-upsert overwrites', (await repo.getPreSurvey(user.id))?.answers.interest_sales === 3);

  await repo.saveDepartmentSelection(user.id, ['sales', 'strategy']);
  check('department selection upsert', (await repo.getDepartmentSelection(user.id))?.departmentSlugs.length === 2);

  const { startSession, loadSessionView } = await import(
    '@/services/scenario/session-service'
  );
  const { saveTaskAnswer } = await import('@/services/scenario/task-service');
  const { openConversation, sendStudentMessage, endConversation } =
    await import('@/services/ai/conversation-service');

  const session = await startSession(user.id, 'sales');
  check('session created against Postgres', Boolean(session.id));
  check('session joins back department/project/scenario keys',
    session.departmentSlug === 'sales' && session.projectKey === 'sales-quickmart-protein-drink' && session.scenarioKey === 'sales-quickmart',
    `${session.departmentSlug}/${session.projectKey}/${session.scenarioKey}`);
  check('startSession is idempotent per department', (await startSession(user.id, 'sales')).id === session.id);
  check('step_progress rows seeded', (await repo.listStepProgress(session.id)).length === 10);

  let view = await loadSessionView(session.id, user.id);
  check('session view builds from Postgres', view.steps.length === 10);
  check('first step unlocked, second locked',
    view.steps[0].unlocked && !view.steps[1].unlocked);

  await saveTaskAnswer({ session, taskKey: 'training-review', value: { acknowledged: true }, status: 'submitted' });
  view = await loadSessionView(session.id, user.id);
  check('training completes and unlocks onboarding', view.steps[1].unlocked);

  // Revision history must be preserved across versions.
  await saveTaskAnswer({ session, taskKey: 'product-strengths', value: { strengths: [{ strength: 'A', evidence: 'e', why_it_may_matter_to_quickmart: 'w' }] }, status: 'draft' });
  await saveTaskAnswer({ session, taskKey: 'product-strengths', value: { strengths: [{ strength: 'B', evidence: 'e', why_it_may_matter_to_quickmart: 'w' }] }, status: 'draft' });
  const answer = await repo.getAnswer(session.id, 'product-strengths');
  const revisions = await repo.listRevisions(session.id, 'product-strengths');
  check('answer version incremented', answer?.version === 2, `v${answer?.version}`);
  check('2 revisions preserved', revisions.length === 2, `${revisions.length}`);
  check('previous value preserved on the revision',
    (revisions[1].previousValue as { strengths: { strength: string }[] }).strengths[0].strength === 'A');
  await saveTaskAnswer({ session, taskKey: 'product-strengths', value: { strengths: [{ strength: 'B', evidence: 'e', why_it_may_matter_to_quickmart: 'w' }] }, status: 'draft' });
  check('unchanged save does NOT create a revision', (await repo.listRevisions(session.id, 'product-strengths')).length === 2);

  console.log('\n=== AI conversation against Postgres ===');
  await openConversation(session, 'bite-sales-manager', 'onboarding');
  const conv = await sendStudentMessage(session, 'bite-sales-manager', 'onboarding', 'What is our minimum wholesale price?');
  check('conversation messages persisted', conv.messages.length === 3, `${conv.messages.length}`);
  const ended = await endConversation(session, 'bite-sales-manager', 'onboarding');
  check('conversation ends', ended.status === 'ended');

  const buyerConv = await openConversation(session, 'quickmart-buyer', 'buyer-meeting');
  const asked = await sendStudentMessage(session, 'quickmart-buyer', 'buyer-meeting', 'What is the morning sales velocity in office area stores?');
  check('hidden fact disclosed and persisted', asked.discoveredFactCount === 1, `${asked.discoveredFactCount}`);
  const stored = await repo.getConversation(buyerConv.id);
  check('revealed_fact_ids written to Postgres', stored?.revealedFactIds.includes('morning_velocity'));

  console.log('\n=== submissions and events ===');
  const submission = await repo.createSubmission({
    sessionId: session.id, taskKey: 'final-proposal', title: 'QuickMart Final Sales Proposal', snapshot: { a: 1 },
  });
  check('submission snapshot stored', (await repo.listSubmissions(session.id))[0].id === submission.id);

  const events = await repo.listEvents({ sessionId: session.id, limit: 500 });
  check('behavior events written to Postgres', events.length > 5, `${events.length} events`);
  check('events ordered oldest-first', events.every((e, i) => i === 0 || events[i - 1].occurredAt <= e.occurredAt));
  check('event types include ai_fact_revealed', events.some((e) => e.eventType === 'ai_fact_revealed'));

  console.log('\n=== session listing / isolation ===');
  check('listSessionsForUser', (await repo.listSessionsForUser(user.id)).length === 1);
  const other = await repo.createUser({ email: 'other-pg@example.com', displayName: 'Other' });
  if (!other) throw new Error('createUser returned null on a fresh email');
  check('other user has no sessions', (await repo.listSessionsForUser(other.id)).length === 0);

  await client.close();
  console.log(`\n${failures === 0 ? '✅ POSTGRES PATH VERIFIED' : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => { console.error(error); process.exit(1); });
