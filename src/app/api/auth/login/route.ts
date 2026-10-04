import { z } from 'zod';
import { NextResponse } from 'next/server';
import { signIn } from '@/lib/auth/session';
import { jsonError, parseBody } from '@/lib/api';

const schema = z.object({
  email: z.string().email('a valid email is required'),
  displayName: z.string().trim().min(1, 'display name is required').max(80),
});

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, schema);
    const user = await signIn(body.email, body.displayName);
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sign-in failed';
    return jsonError(message, 400);
  }
}
