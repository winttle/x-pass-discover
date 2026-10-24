'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RuntimeBadges } from '@/components/branding';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { Cover } from '@/components/media';
import { ResourcePanel } from '@/features/resources/resource-panel';
import { useT } from '@/i18n/client';
import { startStep } from '@/lib/client-api';
import type { SessionView, StepView } from '@/types/session-view';
import { EventCard } from './event-card';
import { ReferencePanel } from './reference-panel';
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
  const t = useT();
  const [view, setView] = useState<SessionView>(initialView);
  // A fresh server render (switching language refreshes the page) replaces the
  // local copy: same session and progress, re-worded.
  const [renderedView, setRenderedView] = useState(initialView);
  if (initialView !== renderedView) {
    setRenderedView(initialView);
    setView(initialView);
  }
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

  // When a save finishes the step the student is on, bring the "next step"
  // card into view so they are not left staring at a 再提出 button.
  const nextStepRef = useRef<HTMLDivElement>(null);
  const [scrollToNext, setScrollToNext] = useState(false);
  const handleSessionUpdate = useCallback(
    (next: SessionView) => {
      const before = view.steps.find((s) => s.key === activeStepKey);
      const after = next.steps.find((s) => s.key === activeStepKey);
      if (before?.status !== 'completed' && after?.status === 'completed') {
        setScrollToNext(true);
      }
      setView(next);
    },
    [view.steps, activeStepKey],
  );

  useEffect(() => {
    if (!scrollToNext) return;
    setScrollToNext(false);
    nextStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [scrollToNext]);

  const goToStep = useCallback((stepKey: string) => {
    setActiveStepKey(stepKey);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isComplete = view.session.status === 'completed';
  const activeIndex = view.steps.findIndex((s) => s.key === activeStep?.key);
  const nextStep = activeIndex >= 0 ? view.steps[activeIndex + 1] : undefined;

  if (!activeStep) {
    return <p className="text-sm text-muted">{t('workspace.noSteps')}</p>;
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
              <dt className="text-muted">{t('workspace.role')}</dt>
              <dd className="truncate text-right text-body" title={view.scenario.studentRole}>
                {view.scenario.studentRole}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">{t('workspace.deadline')}</dt>
              <dd>
                <DeadlineCountdown deadlineAt={view.session.deadlineAt} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">{t('workspace.scenario')}</dt>
              <dd className="font-mono text-body">v{view.scenario.version}</dd>
            </div>
          </dl>
          </div>
        </Card>

        <Card className="p-2">
          <StepRail
            steps={view.steps}
            activeStepKey={activeStep.key}
            onSelect={goToStep}
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
              <span aria-hidden>🏢</span> {t('workspace.enterOffice')}
            </Link>
            <Link
              href={`/admin/events?session=${view.session.id}`}
              className="flex items-center gap-1.5 text-muted transition-colors hover:text-strong"
            >
              <span aria-hidden>📊</span> {t('workspace.inspectEvents')}
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
                  {t('workspace.complete')}
                </Badge>
                <p className="mt-2 text-sm text-strong">
                  {t('workspace.submitted', { title: view.scenario.finalOutputTitle })}
                </p>
              </div>
              <Link
                href="/report"
                className="rounded-xl border border-accent-400/40 px-3.5 py-2 text-xs font-medium text-accent-400 transition-colors hover:bg-accent-400/10"
              >
                {t('workspace.viewReport')}
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
                {t(`stepStatus.${activeStep.status}`)}
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
              {activeStep.lockedReason ?? t('workspace.locked')}
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

            {activeStep.status === 'completed' && nextStep ? (
              <div ref={nextStepRef}>
                <NextStepCard step={nextStep} onGo={() => goToStep(nextStep.key)} />
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* Right: reference material and the Data Room */}
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        {activeStep.media && activeStep.unlocked ? (
          <ReferencePanel media={activeStep.media} />
        ) : null}
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

function NextStepCard({ step, onGo }: { step: StepView; onGo: () => void }) {
  const t = useT();
  return (
    <Card
      className="animate-pop border-accent-400/40 bg-accent-500/5 px-5 py-4"
      data-testid="next-step"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Badge tone="success" dot>
            {t('workspace.stepDone')}
          </Badge>
          <p className="mt-2 text-sm text-strong">
            {step.unlocked
              ? t('workspace.nextStepPrompt', { title: step.title })
              : t('workspace.nextStepLocked', {
                  reason: step.lockedReason ?? t('workspace.locked'),
                })}
          </p>
        </div>
        <Button onClick={onGo} disabled={!step.unlocked} data-testid="go-next-step">
          {t('workspace.nextStep')}
        </Button>
      </div>
    </Card>
  );
}
