'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Field, inputClass } from '@/components/ui';
import { Logo } from '@/components/branding';

/**
 * Account creation. The counterpart to `LoginForm`, and the only place the
 * display name is set.
 *
 * An email that already has an account is refused here and sent to sign-in,
 * rather than quietly signing the visitor in. The two outcomes are genuinely
 * different — one starts a fresh bootcamp, the other resumes one that may
 * already have hours of work in it — and a form that hides which one happened
 * is a form that eventually loses somebody's work.
 */
export function SignupForm({ initialEmail = '' }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, displayName }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError({ message: data.error ?? 'Sign-up failed', code: data.code });
        setPending(false);
        return;
      }
      router.push('/welcome');
      router.refresh();
    } catch {
      setError({ message: 'Sign-up failed. Check your connection and try again.' });
      setPending(false);
    }
  }

  return (
    <Card className="p-6">
      <Logo />

      <h1 className="mt-6 text-lg font-semibold text-strong">Create your BITE account</h1>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        No password is collected or stored. Your email identifies the account; the
        display name is how BITE will address you.
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
        <Field label="Display name" required>
          <input
            type="text"
            required
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
            placeholder="How BITE should address you"
            autoComplete="name"
          />
        </Field>

        {error ? (
          <div
            data-testid="auth-error"
            className="rounded-lg border border-danger-400/30 bg-danger-400/10 px-3 py-2 text-xs text-danger-400"
          >
            <p>{error.message}</p>
            {error.code === 'email_taken' ? (
              <Link
                href={`/login?email=${encodeURIComponent(email)}`}
                className="mt-1.5 inline-block font-medium underline underline-offset-2"
              >
                Sign in with this email instead →
              </Link>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" loading={pending} className="w-full">
          {pending ? 'Creating…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-brand-600 underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}
