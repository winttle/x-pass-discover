import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { UnauthenticatedError, requireUser } from '@/lib/auth/session';
import {
  MISSING_SCHEMA_MESSAGE,
  ScenarioRuleError,
  SetupRequiredError,
  isMissingSchemaError,
} from '@/lib/errors';
import { SessionAccessError } from '@/services/scenario/session-service';
import type { User } from '@/types/runtime';

/**
 * Route handler helpers.
 *
 * Every mutating route goes through `withUser`, so identity always comes from
 * the server session cookie rather than the request body, and every body is
 * parsed through a Zod schema before it reaches a service.
 */

/**
 * `code` is for the cases a form needs to react to rather than just print —
 * offering a link to the sign-up page when the address is unknown, say. The
 * message stays the thing a human reads.
 */
export function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json(code ? { error: message, code } : { error: message }, {
    status,
  });
}

export async function withUser<T>(
  handler: (user: User) => Promise<T>,
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const result = await handler(user);
    return NextResponse.json(result ?? { ok: true });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return jsonError('Not signed in', 401);
    }
    if (error instanceof SessionAccessError) {
      return jsonError(error.message, 403);
    }
    if (error instanceof ZodError) {
      return jsonError(`Invalid request: ${error.issues[0]?.message ?? 'bad input'}`, 400);
    }
    if (error instanceof ScenarioRuleError) {
      // The engine said no on purpose — one line, no stack trace.
      console.warn('[api] rejected:', error.message);
      return jsonError(error.message, 400);
    }
    return faultResponse(error, 'Something went wrong. Please try again.');
  }
}

/**
 * The response for an error that is NOT one of the engine's deliberate
 * rejections — in other words, a fault.
 *
 * A fault's own message is for the log, not for the person: a driver's
 * `relation "users" does not exist` tells a student nothing and tells an
 * attacker a little. The one exception is a database with no schema, because
 * there the message IS the fix and the only person who can ever see it is
 * whoever deployed it.
 */
export function faultResponse(error: unknown, fallback: string) {
  if (isMissingSchemaError(error)) {
    console.error('[api] database schema missing — run the migration:', error);
    return jsonError(MISSING_SCHEMA_MESSAGE, 503, 'setup_required');
  }
  if (error instanceof SetupRequiredError) {
    console.error('[api] setup required:', error.message);
    return jsonError(error.message, 503, 'setup_required');
  }
  console.error('[api]', error);
  return jsonError(fallback, 500);
}

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ZodError([
      { code: 'custom', path: [], message: 'body must be valid JSON' },
    ]);
  }
  return schema.parse(raw);
}
