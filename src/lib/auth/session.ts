import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getRepository } from '@/db/repository';
import { env } from '@/lib/env';
import type { User } from '@/types/runtime';

/**
 * Minimal signed-cookie session.
 *
 * DELIBERATE MVP SIMPLIFICATION. The architecture docs prefer Auth.js; this is
 * a placeholder that keeps the same narrow seam (`signUp`, `signIn`,
 * `signOut`, `getCurrentUser`) so swapping in Auth.js means reimplementing this
 * file and nothing else. There is no password here — it is a development
 * identity, not an authentication system. See README "Production-ready vs
 * placeholder".
 *
 * Because there is no password, `signIn` knowing whether an address exists
 * leaks nothing a visitor could not already learn by signing in as it. Once
 * credentials are real, both paths need to answer identically to an
 * unauthenticated caller — that is a change to these two functions and the two
 * routes that call them, not to anything downstream.
 */

const COOKIE_NAME = 'x_pass_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function sign(payload: string): string {
  return createHmac('sha256', env.authSecret).update(payload).digest('base64url');
}

function encode(userId: string): string {
  const payload = `${userId}.${Date.now()}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

function decode(token: string): string | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  let payload: string;
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [userId, issuedAt] = payload.split('.');
  if (!userId || !issuedAt) return null;
  if (Date.now() - Number(issuedAt) > MAX_AGE_SECONDS * 1000) return null;
  return userId;
}

async function establishSession(user: User): Promise<User> {
  const store = await cookies();
  store.set(COOKIE_NAME, encode(user.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  return user;
}

/**
 * Signs in an account that already exists. Creating one is `signUp`, and the
 * two are deliberately separate: a single call that silently created an
 * account for a mistyped address would hand the student an empty bootcamp and
 * no clue why their work was gone.
 */
export async function signIn(email: string): Promise<User> {
  const user = await getRepository().findUserByEmail(email);
  if (!user) throw new AccountNotFoundError();
  return establishSession(user);
}

/** Creates the account and signs into it. Refuses an address already in use. */
export async function signUp(email: string, displayName: string): Promise<User> {
  const user = await getRepository().createUser({ email, displayName });
  if (!user) throw new EmailAlreadyRegisteredError();
  return establishSession(user);
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * The server's own view of who is calling. Never trust a `user_id` sent in a
 * request body — always resolve identity through this function.
 */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = decode(token);
  if (!userId) return null;
  return getRepository().getUser(userId);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

export class UnauthenticatedError extends Error {
  constructor() {
    super('Not signed in');
    this.name = 'UnauthenticatedError';
  }
}

export class AccountNotFoundError extends Error {
  constructor() {
    super('No account uses that email address yet.');
    this.name = 'AccountNotFoundError';
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('That email address already has an account.');
    this.name = 'EmailAlreadyRegisteredError';
  }
}
