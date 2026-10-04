'use client';

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
    <nav className="space-y-1">
      {steps.map((step, index) => {
        const isActive = step.key === activeStepKey;
        const locked = !step.unlocked;
        const complete = step.status === 'completed';

        return (
          <button
            key={step.key}
            type="button"
            disabled={locked}
            onClick={() => onSelect(step.key)}
            title={locked ? (step.lockedReason ?? undefined) : undefined}
            className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
              isActive
                ? 'border-brand-500/60 bg-brand-500/10'
                : locked
                  ? 'cursor-not-allowed border-transparent opacity-45'
                  : 'border-transparent hover:border-ink-700 hover:bg-ink-850/50'
            }`}
          >
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-semibold ${
                complete
                  ? 'bg-accent-400/20 text-accent-400'
                  : locked
                    ? 'bg-ink-850 text-ink-600'
                    : 'bg-ink-800 text-ink-300'
              }`}
            >
              {complete ? '✓' : locked ? '🔒' : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-xs font-medium ${
                  isActive ? 'text-white' : 'text-ink-200'
                }`}
              >
                {step.title}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-ink-500">
                  {STEP_TYPE_LABEL[step.stepType] ?? step.stepType}
                </span>
                {step.estimatedMinutes ? (
                  <span className="text-[10px] text-ink-600">
                    · {step.estimatedMinutes} min
                  </span>
                ) : null}
              </span>
              {locked && step.lockedReason ? (
                <span className="mt-1 block text-[10px] leading-snug text-ink-600">
                  {step.lockedReason}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function ProgressBar({ steps }: { steps: StepView[] }) {
  const done = steps.filter((s) => s.status === 'completed').length;
  const pct = steps.length === 0 ? 0 : Math.round((done / steps.length) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-ink-400">
        <span>Bootcamp progress</span>
        <Badge tone={pct === 100 ? 'success' : 'muted'}>
          {done}/{steps.length}
        </Badge>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-850">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
