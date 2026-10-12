'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SessionView } from '@/types/session-view';
import { LOBBY_H, LOBBY_W, paintLobby } from './lobby-art';

type Step = {
  title: ReactNode;
  subtitle: ReactNode;
  body?: ReactNode;
  action: string;
};

const Highlight = ({ children }: { children: ReactNode }) => (
  <span className="text-brand-600">{children}</span>
);

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(0);
  const steps = stepsFor(view);
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintLobby(ctx);
  }, []);

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
      <canvas
        ref={canvasRef}
        width={LOBBY_W}
        height={LOBBY_H}
        aria-hidden
        className="h-full w-full object-cover [image-rendering:pixelated]"
      />

      <div className="absolute left-5 top-4 flex items-center gap-2 text-sm font-bold text-white drop-shadow">
        <span className="grid size-6 place-items-center rounded-md bg-brand-600 text-xs">X</span>
        X-PASS Discover
      </div>

      <div className="absolute inset-x-0 top-[5%] flex justify-center px-4">
        <div
          key={index}
          className="w-full max-w-[460px] animate-pop rounded-xl border-[3px] border-[#1d2433] bg-[#fbfaf7] px-6 pb-5 pt-3.5 text-center shadow-[6px_6px_0_rgba(15,23,41,0.35)]"
        >
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted">
            <span>
              INTRO&nbsp;&nbsp;{String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
            </span>
            {!last ? (
              <button
                type="button"
                onClick={onDone}
                className="text-[11px] font-medium text-subtle underline-offset-4 hover:text-strong hover:underline"
                data-testid="office-intro-skip"
              >
                Skip
              </button>
            ) : null}
          </div>

          <div className="mx-auto mt-2 flex w-40 items-center" aria-hidden>
            {steps.map((_, i) => (
              <span key={i} className="flex flex-1 items-center last:flex-none">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${
                    i <= index ? 'bg-brand-600' : 'bg-line-strong'
                  } ${i === index ? 'ring-4 ring-brand-100' : ''}`}
                />
                {i < steps.length - 1 ? (
                  <span className={`h-0.5 flex-1 ${i < index ? 'bg-brand-600' : 'bg-line-strong'}`} />
                ) : null}
              </span>
            ))}
          </div>

          <h2 className="mt-4 text-xl font-bold tracking-tight text-strong sm:text-2xl">{step.title}</h2>
          <p className="mt-1.5 text-sm font-medium text-body">{step.subtitle}</p>
          {step.body ? (
            <div className="mx-auto mt-3 max-w-[380px] text-xs leading-relaxed text-muted">{step.body}</div>
          ) : null}

          <div className="mt-5 flex items-center justify-center gap-3">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="rounded-lg px-3 py-2.5 text-xs font-medium text-muted hover:text-strong"
              >
                Back
              </button>
            ) : null}
            <button
              ref={actionRef}
              type="button"
              onClick={() => (last ? onDone() : setIndex((i) => i + 1))}
              className="min-w-[220px] rounded-lg border-2 border-[#1d4ed8] bg-brand-600 px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-[0_3px_0_#1e3a8a] transition-transform hover:bg-brand-700 active:translate-y-[2px] active:shadow-[0_1px_0_#1e3a8a]"
              data-testid="office-intro-next"
            >
              {step.action}
            </button>
          </div>
        </div>
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
