import { z } from 'zod';
import { NextResponse } from 'next/server';
import { EmailAlreadyRegisteredError, signUp } from '@/lib/auth/session';
import { jsonError, parseBody } from '@/lib/api';

/** Creates an account and signs into it. Returning students use `/api/auth/login`. */
const schema = z.object({
  email: z.string().email('a valid email is required'),
  displayName: z.string().trim().min(1, 'display name is required').max(80),
});

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, schema);
    const user = await signUp(body.email, body.displayName);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return jsonError(error.message, 409, 'email_taken');
    }
    const message = error instanceof Error ? error.message : 'Sign-up failed';
    return jsonError(message, 400);
  }
}
