'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Field, inputClass } from '@/components/ui';
import { Logo } from '@/components/app-shell';

/**
 * Development identity, not authentication. There is no password: this exists
 * so sessions, submissions and behavior events are attributed to a stable user.
 * Replacing it with Auth.js means changing `lib/auth/session.ts` and this form.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, displayName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Sign-in failed');
      router.push('/welcome');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed');
      setPending(false);
    }
  }

  return (
    <Card className="p-6">
      <Logo />

      <h1 className="mt-6 text-lg font-semibold text-white">Sign in to BITE</h1>
      <p className="mt-1 text-xs text-ink-400">
        MVP identity only — no password is collected or stored.
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
          <p className="rounded-lg border border-danger-400/30 bg-danger-400/10 px-3 py-2 text-xs text-danger-400">
            {error}
          </p>
        ) : null}

        <Button type="submit" loading={pending} className="w-full">
          {pending ? 'Signing in…' : 'Enter BITE'}
        </Button>
      </form>
    </Card>
  );
}
