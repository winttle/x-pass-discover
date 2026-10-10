import { z } from 'zod';
import { NextResponse } from 'next/server';
import { AccountNotFoundError, signIn } from '@/lib/auth/session';
import { jsonError, parseBody } from '@/lib/api';

/** Signs into an existing account. Creating one is `/api/auth/signup`. */
const schema = z.object({
  email: z.string().email('a valid email is required'),
});

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, schema);
    const user = await signIn(body.email);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return jsonError(error.message, 404, 'account_not_found');
    }
    const message = error instanceof Error ? error.message : 'Sign-in failed';
    return jsonError(message, 400);
  }
}
