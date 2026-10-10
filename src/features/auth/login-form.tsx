'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Field, inputClass } from '@/components/ui';
import { Logo } from '@/components/branding';

/**
 * Development identity, not authentication. There is no password: this exists
 * so sessions, submissions and behavior events are attributed to a stable user.
 * Replacing it with Auth.js means changing `lib/auth/session.ts` and this form.
 *
 * Sign-in asks for the email and nothing else — the display name belongs to the
 * account, and it was given when the account was created. An address with no
 * account is told so and sent to sign-up rather than having one made for it
 * silently, which is what used to happen: a typo produced a second, empty
 * account and the student's work appeared to have vanished.
 */
export function LoginForm({ initialEmail = '' }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError({ message: data.error ?? 'Sign-in failed', code: data.code });
        setPending(false);
        return;
      }
      router.push('/welcome');
      router.refresh();
    } catch {
      setError({ message: 'Sign-in failed. Check your connection and try again.' });
      setPending(false);
    }
  }

  return (
    <Card className="p-6">
      <Logo />

      <h1 className="mt-6 text-lg font-semibold text-strong">Sign in to BITE</h1>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Enter the email you signed up with. No password is collected or stored.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Email" required>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        {error ? (
          <div
            data-testid="auth-error"
            className="rounded-lg border border-danger-400/30 bg-danger-400/10 px-3 py-2 text-xs text-danger-400"
          >
            <p>{error.message}</p>
            {error.code === 'account_not_found' ? (
              <Link
                href={`/signup?email=${encodeURIComponent(email)}`}
                className="mt-1.5 inline-block font-medium underline underline-offset-2"
              >
                Create an account with this email →
              </Link>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" loading={pending} className="w-full">
          {pending ? 'Signing in…' : 'Enter BITE'}
        </Button>
      </form>

      <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
        First time here?{' '}
        <Link
          href="/signup"
          className="font-medium text-brand-600 underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </Card>
  );
}
