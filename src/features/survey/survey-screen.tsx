'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { PRE_SURVEY_QUESTIONS, localize, type PreSurveyQuestion } from '@/content/pre-survey';
import { useLocale, useT } from '@/i18n/client';
import { useCrispCanvas } from '@/lib/use-crisp-canvas';
import { SURVEY_H, SURVEY_W, paintSurveyRoom } from './survey-art';

type Answers = Record<string, unknown>;

const isAnswered = (question: PreSurveyQuestion, value: unknown) => {
  if (question.kind === 'scale') return typeof value === 'number';
  if (question.optional) return true;
  return typeof value === 'string' && value.trim().length > 0;
};

/** The first unanswered question, so a returning student picks up where they left off. */
function firstOpenIndex(answers: Answers): number {
  const index = PRE_SURVEY_QUESTIONS.findIndex((q) => !isAnswered(q, answers[q.key]));
  return index === -1 ? 0 : index;
}

/**
 * The pre-survey, one question per screen, over the pixel-art office.
 *
 * Pre-survey = the LIKE side of the report, self-reported before any work. It
 * is stored separately from evaluation evidence and must never be merged into
 * a SKILL FIT number. The questions come from `content/pre-survey.ts`.
 */
export function SurveyScreen({
  initialAnswers,
  account,
}: {
  initialAnswers: Answers;
  account: ReactNode;
}) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [index, setIndex] = useState(() => firstOpenIndex(initialAnswers));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  const total = PRE_SURVEY_QUESTIONS.length;
  const question = PRE_SURVEY_QUESTIONS[index];
  const value = answers[question.key];
  const last = index === total - 1;
  const canContinue = isAnswered(question, value);

  const poster = [1, 2, 3, 4, 5].map((n) => t(`survey.poster.${n}` as 'survey.poster.1'));
  useCrispCanvas(canvasRef, SURVEY_W, SURVEY_H, (ctx) => paintSurveyRoom(ctx, poster), [poster.join('|')]);

  const setValue = (key: string, next: unknown) =>
    setAnswers((prev) => ({ ...prev, [key]: next }));

  const submit = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/pre-survey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json();
      // The sign-in cookie no longer resolves to an account (it expired, or the
      // server's key or store changed): say so and offer the way back in.
      if (response.status === 401) {
        setSignedOut(true);
        setError(t('auth.sessionExpired'));
        setPending(false);
        return;
      }
      if (!response.ok) throw new Error(data.error ?? t('survey.saveFailed'));
      router.push('/departments');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('survey.saveFailed'));
      setPending(false);
    }
  }, [answers, router, t]);

  const next = useCallback(() => {
    if (!canContinue || pending) return;
    if (last) void submit();
    else setIndex((i) => Math.min(total - 1, i + 1));
  }, [canContinue, last, pending, submit, total]);

  const back = () => setIndex((i) => Math.max(0, i - 1));

  // Keys 1–5 answer a scale question; Enter moves on. Typing in a text answer
  // is left alone.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'TEXTAREA' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (question.kind === 'scale' && /^[1-5]$/.test(event.key)) {
        setValue(question.key, Number(event.key));
        return;
      }
      if (event.key === 'Enter' && target?.tagName !== 'BUTTON' && target?.tagName !== 'A') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, next]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#1d2433]" data-testid="survey-screen">
      <TopBar account={account} />

      <div className="relative flex min-h-0 flex-1">
        <SideNav />

        <div className="relative min-w-0 flex-1">
          {/* The office fills the work area, beside the navigation rather than under it. */}
          <canvas
            ref={canvasRef}
            width={SURVEY_W}
            height={SURVEY_H}
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-bottom"
          />
        <main className="relative flex h-full flex-col items-center overflow-y-auto px-4 pb-8 pt-5 sm:px-8">
          <Stepper />

          <section
            className="mt-5 w-full max-w-[720px] animate-fade-up rounded-2xl border border-white/70 bg-[#fbfaf7]/95 p-5 shadow-[0_18px_50px_-12px_rgba(15,23,41,0.45)] backdrop-blur-sm sm:p-7"
            aria-labelledby="survey-title"
          >
            <header className="flex flex-wrap items-start justify-between gap-4 sm:flex-nowrap">
              <div className="flex min-w-0 items-start gap-3">
                <span aria-hidden className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-[#1d2433] text-white">
                  <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <rect x="4" y="3" width="12" height="15" rx="2" />
                    <path d="M7.5 3V2h5v1M7 8h6M7 11h6M7 14h4" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h1 id="survey-title" className="text-2xl font-bold tracking-tight text-strong">
                    {t('survey.title')}
                  </h1>
                  <p className="mt-0.5 text-xs text-muted">
                    {t('survey.lead')}
                  </p>
                </div>
              </div>
              <div className="w-full shrink-0 sm:mt-1 sm:w-40">
                <p className="text-right text-xs font-semibold tabular-nums text-body" data-testid="survey-progress">
                  {index + 1} / {total}
                </p>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"
                  role="progressbar"
                  aria-valuemin={1}
                  aria-valuemax={total}
                  aria-valuenow={index + 1}
                  aria-label={t('survey.progress')}
                >
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all duration-300"
                    style={{ width: `${((index + 1) / total) * 100}%` }}
                  />
                </div>
              </div>
            </header>

            <div
              key={question.key}
              className="mt-6 animate-pop rounded-xl border border-line bg-sunken/70 p-4 sm:p-5"
              data-question-key={question.key}
              data-question-kind={question.kind}
            >
              <p className="flex gap-2 text-base font-semibold leading-snug text-strong" id={`q-${question.key}`}>
                <span className="shrink-0 font-bold text-brand-600">Q.</span>
                <span>{localize(question.prompt, locale)}</span>
              </p>

              {question.kind === 'scale' ? (
                <div className="mt-4">
                  <div className="grid grid-cols-5 gap-2 sm:gap-3" role="group" aria-labelledby={`q-${question.key}`}>
                    {[1, 2, 3, 4, 5].map((score) => {
                      const selected = value === score;
                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setValue(question.key, score)}
                          aria-pressed={selected}
                          className={`h-12 rounded-lg border text-base font-semibold transition-all duration-150 active:scale-[0.97] sm:h-14 ${
                            selected
                              ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/25'
                              : 'border-line-strong bg-surface text-strong hover:border-brand-400 hover:bg-brand-50'
                          }`}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between gap-4 text-[11px] text-muted">
                    <span>{question.low ? localize(question.low, locale) : t('survey.low')}</span>
                    <span className="text-right">{question.high ? localize(question.high, locale) : t('survey.high')}</span>
                  </div>
                </div>
              ) : (
                <textarea
                  rows={4}
                  aria-labelledby={`q-${question.key}`}
                  className="mt-4 w-full resize-none rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-strong outline-none transition-colors placeholder:text-subtle focus:border-brand-500"
                  value={typeof value === 'string' ? value : ''}
                  placeholder={question.placeholder ? localize(question.placeholder, locale) : undefined}
                  onChange={(e) => setValue(question.key, e.target.value)}
                  autoFocus
                />
              )}
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-danger-400/30 bg-danger-400/10 px-3 py-2 text-xs text-danger-600">
                {error}
                {signedOut ? (
                  <>
                    {' '}
                    <Link href="/login" className="font-semibold underline underline-offset-2">
                      {t('auth.signInAgain')}
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}

            <footer className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push('/departments')}
                className="text-xs font-medium text-subtle underline-offset-4 hover:text-strong hover:underline"
              >
                {t('survey.skip')}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={back}
                  disabled={index === 0 || pending}
                  className="h-11 min-w-[110px] rounded-lg border border-line-strong bg-sunken px-5 text-sm font-semibold text-body transition-colors hover:bg-line disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="survey-back"
                >
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  onClick={next}
                  disabled={!canContinue || pending}
                  className="inline-flex h-11 min-w-[130px] items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="survey-next"
                >
                  {pending ? t('survey.saving') : last ? t('survey.submit') : t('common.next')}
                  {!pending ? <span aria-hidden>›</span> : null}
                </button>
              </div>
            </footer>
          </section>
        </main>
        </div>
      </div>
    </div>
  );
}

function TopBar({ account }: { account: ReactNode }) {
  const t = useT();
  const links = [
    { href: '/welcome', label: t('survey.nav.home'), icon: 'M3 9.5 10 4l7 5.5V17H3z' },
    { href: '/departments', label: t('survey.nav.programs'), icon: 'M5 3h10v14H5zM8 7h4M8 10h4M8 13h2' },
    { href: '/report', label: t('survey.nav.reports'), icon: 'M4 16V9M10 16V4M16 16v-5' },
  ];
  return (
    <header className="relative z-10 flex h-12 shrink-0 items-center justify-between gap-4 bg-[#1d2433]/95 px-4 text-white shadow-md sm:px-5">
      <Link href="/" className="flex items-center gap-2 text-sm font-bold">
        <span className="grid size-6 place-items-center rounded-md bg-brand-600 text-xs">X</span>
        X-PASS Discover
      </Link>
      <div className="flex items-center gap-1 sm:gap-4">
        <nav className="hidden items-center gap-4 sm:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 text-xs font-medium text-white/85 hover:text-white"
            >
              <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d={link.icon} strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="rounded-lg bg-surface px-2 py-1">{account}</div>
      </div>
    </header>
  );
}

function SideNav() {
  const t = useT();
  const items = [
    { href: '/welcome', label: t('survey.side.home'), active: false },
    { href: '/pre-survey', label: t('survey.side.survey'), active: true },
    { href: '/departments', label: t('survey.side.simulations'), active: false },
    { href: '/report', label: t('survey.side.results'), active: false },
  ];
  return (
    <aside className="relative z-10 hidden w-48 shrink-0 flex-col justify-between bg-[#1d2433] py-4 text-white md:flex">
      <nav className="space-y-1 px-2" aria-label="Onboarding">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={`block rounded-lg px-3 py-2 text-xs font-medium ${
              item.active ? 'bg-brand-600 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-4 text-[11px] leading-relaxed text-white/70">
        <p>
          {t('survey.side.tagline1')}
          <br />
          {t('survey.side.tagline2')}
        </p>
        <p className="mt-2 font-bold text-white">X-PASS Discover</p>
      </div>
    </aside>
  );
}

/** Day one: intro done, the survey now, job simulations and the report to come. */
function Stepper() {
  const t = useT();
  const steps = [t('survey.step.intro'), t('survey.step.survey'), t('survey.step.simulations'), t('survey.step.report')];
  const current = 1;
  return (
    <ol
      className="flex w-full max-w-[520px] items-center rounded-xl border border-white/60 bg-surface/90 px-4 py-2.5 shadow-float backdrop-blur-sm"
      aria-label={t('survey.stepper')}
    >
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none" aria-current={active ? 'step' : undefined}>
            <span className="flex flex-col items-center gap-1">
              <span
                className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${
                  done
                    ? 'bg-brand-600 text-white'
                    : active
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                      : 'border-2 border-line-strong bg-surface'
                }`}
              >
                {done ? '✓' : ''}
              </span>
              <span className={`whitespace-nowrap text-[10px] font-semibold ${active || done ? 'text-strong' : 'text-muted'}`}>
                {label}
              </span>
            </span>
            {i < steps.length - 1 ? (
              <span aria-hidden className={`mx-2 mb-4 h-0.5 flex-1 ${i < current ? 'bg-brand-600' : 'bg-line-strong'}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
