import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { UnauthenticatedError, requireUser } from '@/lib/auth/session';
import { SessionAccessError } from '@/services/scenario/session-service';
import type { User } from '@/types/runtime';

/**
 * Route handler helpers.
 *
 * Every mutating route goes through `withUser`, so identity always comes from
 * the server session cookie rather than the request body, and every body is
 * parsed through a Zod schema before it reaches a service.
 */

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[api]', message, error);
    return jsonError(message, 400);
  }
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
