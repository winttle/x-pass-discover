'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, CardHeader, Field, inputClass } from '@/components/ui';
import { DEPARTMENTS } from '@/content/departments';

/**
 * Pre-survey = the LIKE side of the report, self-reported before any work.
 * It is stored separately from evaluation evidence and must never be merged
 * into a SKILL FIT number.
 */
export function PreSurveyForm({
  initialAnswers,
}: {
  initialAnswers: Record<string, unknown>;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setValue = (key: string, value: unknown) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/pre-survey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save');
      router.push('/departments');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader
          title="How interested are you in each kind of work?"
          subtitle="1 = not at all · 5 = very interested. There are no wrong answers here."
        />
        <div className="space-y-4 px-5 py-5">
          {DEPARTMENTS.map((department) => {
            const key = `interest_${department.slug}`;
            const current = Number(answers[key] ?? 3);
            return (
              <div key={department.slug}>
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className="text-sm font-medium"
                    style={{ color: department.accentColor }}
                  >
                    {department.name}
                  </span>
                  <span className="text-[11px] text-ink-400">{department.tagline}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setValue(key, score)}
                      className={`h-9 flex-1 rounded-lg border text-xs font-medium transition-colors ${
                        current === score
                          ? 'border-brand-500 bg-brand-500/20 text-white'
                          : 'border-ink-700 text-ink-400 hover:border-ink-500 hover:text-ink-200'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader title="A little context" />
          <div className="space-y-4 px-5 py-5">
            <Field
              label="What kind of work do you think suits you, and why?"
              helpText="We will show this back to you at the end, next to what the work actually showed."
            >
              <textarea
                rows={5}
                className={inputClass}
                value={String(answers.self_hypothesis ?? '')}
                onChange={(e) => setValue('self_hypothesis', e.target.value)}
                placeholder="Your current hypothesis about yourself."
              />
            </Field>
            <Field label="Any work experience so far? (optional)">
              <textarea
                rows={3}
                className={inputClass}
                value={String(answers.experience ?? '')}
                onChange={(e) => setValue('experience', e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {error ? (
          <p className="rounded-lg border border-danger-400/30 bg-danger-400/10 px-3 py-2 text-xs text-danger-400">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save and continue'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/departments')}
          >
            Skip for now
          </Button>
        </div>
      </div>
    </form>
  );
}
