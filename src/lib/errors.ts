/**
 * An intentional rejection, not a bug.
 *
 * Thrown when the engine's own rules say no — writing into a step that is still
 * locked, starting a department that has no scenario, reopening a conversation
 * that has ended. These are normal outcomes of a student clicking around, so
 * they are reported to the client as a 400 and logged as a single line rather
 * than a stack trace. Anything that is NOT one of these is an actual fault and
 * keeps its full trace.
 */
export class ScenarioRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioRuleError';
  }
}

/**
 * The deployment is not finished, and only whoever deployed it can finish it.
 *
 * Distinct from `ScenarioRuleError` (the engine saying no to a student) and
 * from an ordinary fault (whose message belongs in the log, not on a screen).
 * These messages are written for the operator and are meant to reach them,
 * because the alternative is a student staring at a failure nobody can act on.
 */
export class SetupRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SetupRequiredError';
  }
}

/**
 * What an operator is told when the database has no tables.
 *
 * This is the one deployment mistake the app cannot do anything about and
 * cannot hide: `DATABASE_URL` is set, so persistence is Neon, but the
 * migration was never applied against it. Left to the generic handler it
 * surfaces as `relation "users" does not exist`, which tells whoever is
 * testing the deployment nothing about what to do next.
 */
export const MISSING_SCHEMA_MESSAGE =
  'This deployment\u2019s database has no tables yet. Run `npm run db:migrate` and ' +
  '`npm run db:seed` against its DATABASE_URL, then try again.';

/**
 * True when a query failed because the table is not there.
 *
 * `42P01` is PostgreSQL\u2019s `undefined_table`; the message check is a fallback
 * for drivers that forward the text without the code.
 */
export function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ((error as { code?: unknown }).code === '42P01') return true;
  const message = error instanceof Error ? error.message : '';
  return /relation "[^"]+" does not exist/i.test(message);
}
