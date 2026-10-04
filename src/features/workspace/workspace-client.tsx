'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RuntimeBadges } from '@/components/app-shell';
import { Badge, Card, CardHeader } from '@/components/ui';
import { ResourcePanel } from '@/features/resources/resource-panel';
import { startStep } from '@/lib/client-api';
import type { SessionView } from '@/types/session-view';
import { EventCard } from './event-card';
import { ProgressBar, StepRail } from './step-rail';
import { TaskCard } from './task-card';

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

  function selectStep(stepKey: string) {
    setActiveStepKey(stepKey);
  }

  const deadline = new Date(view.session.deadlineAt);
  const isComplete = view.session.status === 'completed';

  if (!activeStep) {
    return <p className="text-sm text-ink-400">This scenario has no steps.</p>;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
      {/* Left: step rail */}
      <aside className="space-y-4">
        <Card className="p-4">
          <ProgressBar steps={view.steps} />
          <div className="mt-4 space-y-1.5 border-t border-ink-800 pt-3 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="text-ink-500">Role</span>
              <span className="text-right text-ink-300">{view.scenario.studentRole}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-ink-500">Deadline</span>
              <span className="text-right text-ink-300">
                {deadline.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-ink-500">Scenario</span>
              <span className="text-right text-ink-300">
                v{view.scenario.version}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-2">
          <StepRail
            steps={view.steps}
            activeStepKey={activeStep.key}
            onSelect={selectStep}
          />
        </Card>

        <Card className="p-4">
          <RuntimeBadges
            persistenceLabel={view.runtime.persistenceLabel}
            aiLabel={view.runtime.aiLabel}
            aiModeDowngraded={view.runtime.aiModeDowngraded}
          />
          <div className="mt-3 flex flex-col gap-1.5 text-[11px]">
            <Link
              href={`/office?session=${view.session.id}`}
              className="text-ink-400 underline-offset-4 hover:text-white hover:underline"
            >
              → Enter the 2D office
            </Link>
            <Link
              href={`/admin/events?session=${view.session.id}`}
              className="text-ink-400 underline-offset-4 hover:text-white hover:underline"
            >
              → Inspect behavior events
            </Link>
          </div>
        </Card>
      </aside>

      {/* Center: active step */}
      <section className="min-w-0 space-y-4">
        {isComplete ? (
          <Card className="border-accent-400/40 bg-accent-400/5 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge tone="success">Bootcamp complete</Badge>
                <p className="mt-2 text-sm text-ink-200">
                  You submitted the {view.scenario.finalOutputTitle}.
                </p>
              </div>
              <Link
                href="/report"
                className="rounded-lg border border-accent-400/40 px-3.5 py-2 text-xs text-accent-400 transition-colors hover:bg-accent-400/10"
              >
                View career report →
              </Link>
            </div>
          </Card>
        ) : null}

        <Card>
          <CardHeader
            title={activeStep.title}
            subtitle={activeStep.summary ?? undefined}
            right={
              <Badge
                tone={
                  activeStep.status === 'completed'
                    ? 'success'
                    : activeStep.unlocked
                      ? 'brand'
                      : 'muted'
                }
              >
                {activeStep.status.replace('_', ' ')}
              </Badge>
            }
          />
          {activeStep.instructions ? (
            <p className="px-5 py-4 text-sm leading-relaxed text-ink-300">
              {activeStep.instructions}
            </p>
          ) : null}
        </Card>

        {!activeStep.unlocked ? (
          <Card className="px-5 py-8 text-center">
            <p className="text-sm text-ink-400">
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
      <aside className="space-y-4">
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
