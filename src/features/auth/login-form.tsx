'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Field, inputClass } from '@/components/ui';
import { Logo } from '@/components/branding';
import { useT } from '@/i18n/client';

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
  const t = useT();
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
        setError({
          message:
            data.code === 'account_not_found'
              ? t('auth.login.notFound')
              : (data.error ?? t('auth.login.failed')),
          code: data.code,
        });
        setPending(false);
        return;
      }
      router.push('/start');
      router.refresh();
    } catch {
      setError({ message: t('auth.login.offline') });
      setPending(false);
    }
  }

  return (
    <Card className="p-6">
      <Logo />

      <h1 className="mt-6 text-lg font-semibold text-strong">{t('auth.login.title')}</h1>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {t('auth.login.lead')}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label={t('auth.email')} required>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder={t('auth.emailPlaceholder')}
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
                {t('auth.login.createInstead')}
              </Link>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" loading={pending} className="w-full">
          {pending ? t('auth.login.pending') : t('auth.login.submit')}
        </Button>
      </form>

      <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
        {t('auth.login.firstTime')}{' '}
        <Link
          href="/signup"
          className="font-medium text-brand-600 underline-offset-2 hover:underline"
        >
          {t('auth.login.createLink')}
        </Link>
      </p>
    </Card>
  );
}
