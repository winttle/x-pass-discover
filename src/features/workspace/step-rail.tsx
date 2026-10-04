'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui';
import type { StepView } from '@/types/session-view';

const STEP_TYPE_LABEL: Record<string, string> = {
  training: 'Training',
  briefing: 'Briefing',
  research: 'Research',
  analysis: 'Analysis',
  ai_interaction: 'Meeting',
  decision: 'Decision',
  unexpected_event: 'Event',
  revision: 'Revision',
  final_submission: 'Handover',
};

/**
 * The step list reads as a timeline rather than a menu: the scenario is a
 * sequence of work, and the connector line makes "where I am" and "what is
 * still sealed" legible at a glance.
 */
export function StepRail({
  steps,
  activeStepKey,
  onSelect,
}: {
  steps: StepView[];
  activeStepKey: string;
  onSelect: (stepKey: string) => void;
}) {
  return (
    <nav className="relative py-1" aria-label="Bootcamp steps">
      {steps.map((step, index) => {
        const isActive = step.key === activeStepKey;
        const locked = !step.unlocked;
        const complete = step.status === 'completed';
        const isLast = index === steps.length - 1;

        return (
          <div key={step.key} className="relative">
            {!isLast ? (
              <span
                aria-hidden
                className={`absolute left-[21px] top-8 h-[calc(100%-1rem)] w-px ${
                  complete ? 'bg-accent-400/45' : 'bg-sunken'
                }`}
              />
            ) : null}

            <button
              type="button"
              disabled={locked}
              onClick={() => onSelect(step.key)}
              title={locked ? (step.lockedReason ?? undefined) : undefined}
              aria-current={isActive ? 'step' : undefined}
              className={`relative flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-150 ${
                isActive
                  ? 'bg-brand-500/10 ring-1 ring-brand-500/40'
                  : locked
                    ? 'cursor-not-allowed opacity-40'
                    : 'hover:bg-sunken'
              }`}
            >
              <span
                className={`z-10 mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full border text-[10px] font-semibold transition-colors ${
                  complete
                    ? 'border-accent-400/50 bg-accent-400/15 text-accent-400'
                    : isActive
                      ? 'border-brand-400 bg-brand-500 text-white'
                      : locked
                        ? 'border-line bg-surface text-subtle'
                        : 'border-line bg-sunken text-body'
                }`}
              >
                {complete ? '✓' : locked ? '🔒' : index + 1}
              </span>

              <span className="min-w-0 flex-1 pt-0.5">
                <span
                  className={`block truncate text-xs font-medium ${
                    isActive ? 'text-strong' : complete ? 'text-muted' : 'text-strong'
                  }`}
                >
                  {step.title}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                    {STEP_TYPE_LABEL[step.stepType] ?? step.stepType}
                  </span>
                  {step.estimatedMinutes ? (
                    <span className="text-[10px] text-subtle">
                      · {step.estimatedMinutes} min
                    </span>
                  ) : null}
                </span>
                {locked && step.lockedReason ? (
                  <span className="mt-1 block text-[10px] leading-snug text-subtle">
                    {step.lockedReason}
                  </span>
                ) : null}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

export function ProgressRing({ steps }: { steps: StepView[] }) {
  const done = steps.filter((s) => s.status === 'completed').length;
  const total = steps.length || 1;
  const pct = Math.round((done / total) * 100);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-3.5">
      <div className="relative size-16 shrink-0">
        <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-line"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            className={pct === 100 ? 'text-accent-400' : 'text-brand-500'}
            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          <span className="font-mono text-sm font-semibold text-strong">{pct}%</span>
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-strong">Bootcamp progress</p>
        <p className="mt-0.5 text-[11px] text-muted">
          {done} of {steps.length} steps complete
        </p>
      </div>
    </div>
  );
}

/**
 * Live countdown to the 24-hour deadline. Pure presentation — nothing in the
 * engine expires a session yet, so this informs rather than enforces.
 */
export function DeadlineCountdown({ deadlineAt }: { deadlineAt: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(new Date(deadlineAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [deadlineAt]);

  if (remaining === null) {
    return <span className="font-mono text-[11px] text-muted">—</span>;
  }

  if (remaining <= 0) {
    return (
      <Badge tone="danger" dot>
        Deadline passed
      </Badge>
    );
  }

  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const tone = hours < 3 ? 'warn' : 'muted';

  return (
    <Badge tone={tone} dot title={new Date(deadlineAt).toLocaleString()}>
      {hours}h {String(minutes).padStart(2, '0')}m left
    </Badge>
  );
}
