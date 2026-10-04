'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RuntimeBadges } from '@/components/app-shell';
import { Badge, Card, CardHeader } from '@/components/ui';
import { Cover } from '@/components/media';
import { ResourcePanel } from '@/features/resources/resource-panel';
import { startStep } from '@/lib/client-api';
import type { SessionView } from '@/types/session-view';
import { EventCard } from './event-card';
import { DeadlineCountdown, ProgressRing, StepRail } from './step-rail';
import { TaskCard } from './task-card';

const STEP_STATUS_TONE = {
  completed: 'success',
  in_progress: 'brand',
  available: 'brand',
  locked: 'muted',
} as const;

/**
 * The work/data layer.
 *
 * Everything the student actually produces lives here in normal React. The
 * Phaser office is a separate experience layer that links into this view — it
 * never holds business state.
 */
export function WorkspaceClient({ initialView }: { initialView: SessionView }) {
  const [view, setView] = useState<SessionView>(initialView);
  const [activeStepKey, setActiveStepKey] = useState<string>(
    () =>
      initialView.session.currentStepKey ??
      initialView.steps.find((s) => s.unlocked)?.key ??
      initialView.steps[0]?.key ??
      '',
  );

  const activeStep = useMemo(
    () => view.steps.find((s) => s.key === activeStepKey) ?? view.steps[0],
    [view.steps, activeStepKey],
  );

  // Record that the student opened this step. Fire-and-forget by design.
  useEffect(() => {
    if (!activeStep?.unlocked) return;
    void startStep(view.session.id, activeStep.key);
  }, [view.session.id, activeStep?.key, activeStep?.unlocked]);

  const handleSessionUpdate = useCallback((next: SessionView) => {
    setView(next);
  }, []);

  const isComplete = view.session.status === 'completed';

  if (!activeStep) {
    return <p className="text-sm text-muted">This scenario has no steps.</p>;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[272px_minmax(0,1fr)_356px]">
      {/* Left: progress + step timeline */}
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <Card>
          <Cover
            src={view.department.coverImage}
            alt=""
            className="h-24 border-b border-line"
            overlay={
              <span className="absolute bottom-2.5 left-3.5">
                <span
                  className="rounded-full bg-surface/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-card"
                  style={{ color: view.department.accentColor }}
                >
                  {view.department.name}
                </span>
              </span>
            }
          />
          <div className="p-4">
          <ProgressRing steps={view.steps} />

          <dl className="mt-4 space-y-2 border-t border-line pt-3 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Role</dt>
              <dd className="truncate text-right text-body" title={view.scenario.studentRole}>
                {view.scenario.studentRole}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Deadline</dt>
              <dd>
                <DeadlineCountdown deadlineAt={view.session.deadlineAt} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Scenario</dt>
              <dd className="font-mono text-body">v{view.scenario.version}</dd>
            </div>
          </dl>
          </div>
        </Card>

        <Card className="p-2">
          <StepRail
            steps={view.steps}
            activeStepKey={activeStep.key}
            onSelect={setActiveStepKey}
          />
        </Card>

        <Card className="p-4">
          <RuntimeBadges
            persistenceLabel={view.runtime.persistenceLabel}
            persistenceIsEphemeral={view.runtime.persistenceIsEphemeral}
            aiLabel={view.runtime.aiLabel}
            aiModeDowngraded={view.runtime.aiModeDowngraded}
          />
          <div className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3 text-[11px]">
            <Link
              href={`/office?session=${view.session.id}`}
              className="flex items-center gap-1.5 text-muted transition-colors hover:text-strong"
            >
              <span aria-hidden>🏢</span> Enter the 2D office
            </Link>
            <Link
              href={`/admin/events?session=${view.session.id}`}
              className="flex items-center gap-1.5 text-muted transition-colors hover:text-strong"
            >
              <span aria-hidden>📊</span> Inspect behavior events
            </Link>
          </div>
        </Card>
      </aside>

      {/* Center: active step */}
      <section className="min-w-0 space-y-4">
        {isComplete ? (
          <Card className="animate-pop border-accent-400/40 bg-accent-500/5 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge tone="success" dot>
                  Bootcamp complete
                </Badge>
                <p className="mt-2 text-sm text-strong">
                  You submitted the {view.scenario.finalOutputTitle}.
                </p>
              </div>
              <Link
                href="/report"
                className="rounded-xl border border-accent-400/40 px-3.5 py-2 text-xs font-medium text-accent-400 transition-colors hover:bg-accent-400/10"
              >
                View career report →
              </Link>
            </div>
          </Card>
        ) : null}

        <Card accent={view.department.accentColor}>
          <CardHeader
            title={activeStep.title}
            subtitle={activeStep.summary ?? undefined}
            right={
              <Badge tone={STEP_STATUS_TONE[activeStep.status]} dot>
                {activeStep.status.replace('_', ' ')}
              </Badge>
            }
          />
          {activeStep.instructions ? (
            <p className="px-5 py-4 text-[13px] leading-relaxed text-body">
              {activeStep.instructions}
            </p>
          ) : null}
        </Card>

        {!activeStep.unlocked ? (
          <Card className="px-5 py-10 text-center">
            <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-sunken text-base">
              🔒
            </div>
            <p className="text-sm text-muted">
              {activeStep.lockedReason ?? 'This step is not available yet.'}
            </p>
          </Card>
        ) : (
          <>
            {activeStep.eventPayload ? (
              <EventCard
                sessionId={view.session.id}
                stepKey={activeStep.key}
                payload={activeStep.eventPayload}
              />
            ) : null}

            {activeStep.tasks.map((task) => (
              <TaskCard
                key={task.key}
                sessionId={view.session.id}
                step={activeStep}
                task={task}
                steps={view.steps}
                resources={view.resources}
                personas={view.personas}
                onSessionUpdate={handleSessionUpdate}
              />
            ))}
          </>
        )}
      </section>

      {/* Right: resources */}
      <aside className="xl:sticky xl:top-20 xl:self-start">
        <ResourcePanel
          sessionId={view.session.id}
          resources={view.resources}
          highlightKeys={activeStep.resourceKeys}
          stepKey={activeStep.key}
        />
      </aside>
    </div>
  );
}
