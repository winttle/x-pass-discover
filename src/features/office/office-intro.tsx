'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SessionView } from '@/types/session-view';
import { Highlight, IntroCard, LobbyBrand, LobbyCanvas } from '@/features/lobby/intro-card';

type Step = {
  title: ReactNode;
  subtitle: ReactNode;
  body?: ReactNode;
  action: string;
};

function stepsFor(view: SessionView | null): Step[] {
  const currentStep = view?.steps.find((s) => s.key === view.session.currentStepKey);
  return [
    {
      title: (
        <>
          Your <Highlight>bootcamp</Highlight> starts now.
        </>
      ),
      subtitle: 'Are you ready?',
      action: 'Start',
    },
    {
      title: (
        <>
          Welcome to <Highlight>BITE</Highlight>.
        </>
      ),
      subtitle: view
        ? `You join ${view.department.name} as ${view.scenario.studentRole}.`
        : 'You are visiting as a guest today.',
      body: 'Everyone you meet here is an AI colleague. They answer what you ask — and only that — so the questions are yours to choose.',
      action: 'Next',
    },
    {
      title: (
        <>
          How the <Highlight>office</Highlight> works
        </>
      ),
      subtitle: 'Walk anywhere. Press E when something lights up.',
      body: (
        <ul className="space-y-1.5 text-left">
          <li>
            <Key>WASD</Key> / <Key>↑←↓→</Key> walk
          </li>
          <li>
            <Key>E</Key> talk to a colleague, open what is in front of you
          </li>
          <li>
            <strong className="text-strong">My Desk</strong> opens your workspace ·{' '}
            <strong className="text-strong">Data Room</strong> holds the files ·{' '}
            <strong className="text-strong">Meeting Room A</strong> is for meetings
          </li>
        </ul>
      ),
      action: 'Next',
    },
    {
      title: (
        <>
          Your <Highlight>first mission</Highlight>
        </>
      ),
      subtitle: view
        ? (currentStep?.title ?? view.department.projectTitle)
        : 'Start a bootcamp from Departments to get one.',
      body: view ? <span className="line-clamp-3">{view.scenario.mission}</span> : undefined,
      action: 'Enter the office',
    },
  ];
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-sunken px-1.5 py-px font-mono text-[11px] text-strong">
      {children}
    </kbd>
  );
}

/**
 * The first-morning intro: the BITE lobby, and four short cards before the
 * student walks into the office. It is pure presentation — nothing here is
 * recorded — and the office page decides when to show it.
 */
export function OfficeIntro({
  view,
  onDone,
}: {
  view: SessionView | null;
  onDone: () => void;
}) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(0);
  const steps = stepsFor(view);
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    actionRef.current?.focus();
  }, [index]);

  return (
    <div
      className="absolute inset-0 z-30 overflow-hidden rounded-2xl bg-[#1d2433]"
      data-testid="office-intro"
      role="dialog"
      aria-modal="true"
      aria-label="Bootcamp intro"
    >
      <LobbyCanvas />
      <div className="absolute left-5 top-4">
        <LobbyBrand />
      </div>
      <div className="absolute inset-x-0 top-[5%] flex justify-center px-4">
        <IntroCard
          index={index}
          total={steps.length}
          title={step.title}
          subtitle={step.subtitle}
          body={step.body}
          action={step.action}
          onAction={() => (last ? onDone() : setIndex((i) => i + 1))}
          onBack={index > 0 ? () => setIndex((i) => i - 1) : undefined}
          onSkip={last ? undefined : onDone}
          actionRef={actionRef}
          testIdPrefix="office-intro"
        />
      </div>
    </div>
  );
}

/** Per-viewer memory of who has seen the intro. Storage can be unavailable. */
export const introKey = (view: SessionView | null) =>
  `xpass:office-intro:${view?.session.id ?? 'visitor'}`;

export function hasSeenIntro(view: SessionView | null): boolean {
  try {
    return window.localStorage.getItem(introKey(view)) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(view: SessionView | null): void {
  try {
    window.localStorage.setItem(introKey(view), '1');
  } catch {
    // Without storage the intro simply shows again next time.
  }
}
