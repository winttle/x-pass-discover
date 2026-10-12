'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui';
import { Minimap } from './minimap';
import { ChatPanel } from '@/features/ai/chat-panel';
import { ResourcePanel } from '@/features/resources/resource-panel';
import { OfficeBridge, type OfficeEvent } from '@/game/office/bridge';
import type { OfficeNpc } from '@/game/office/map';
import { logClientEvent } from '@/lib/client-api';
import type { SessionView } from '@/types/session-view';
import { OfficeCanvas } from './office-canvas';
import { OfficeIntro, hasSeenIntro, markIntroSeen } from './office-intro';

type Overlay =
  | { kind: 'none' }
  | { kind: 'resources' }
  | { kind: 'chat'; personaKey: string; stepKey: string }
  | { kind: 'message'; title: string; body: string }
  | { kind: 'notifications' };

/**
 * The office page.
 *
 * Phaser reports an interaction; React decides what it means and opens the
 * right work surface. Business state stays on this side of the bridge.
 */
export function OfficeClient({ initialView }: { initialView: SessionView | null }) {
  const router = useRouter();
  const bridge = useMemo(() => new OfficeBridge(), []);
  const [view, setView] = useState<SessionView | null>(initialView);
  const [prompt, setPrompt] = useState<{
    text: string;
    action: string;
    target: string | null;
  } | null>(null);
  const [zoneName, setZoneName] = useState<string>('Reception');
  const [zoneKey, setZoneKey] = useState<string | null>('reception');
  const [playerTile, setPlayerTile] = useState<{ x: number; y: number } | null>(null);
  const [booted, setBooted] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const viewRef = useRef(view);
  viewRef.current = view;
  // The lobby intro shows once per bootcamp. Decided after mount, since only
  // the browser knows whether it has been seen.
  const [introOpen, setIntroOpen] = useState(false);
  const introOpenRef = useRef(introOpen);
  introOpenRef.current = introOpen;

  useEffect(() => {
    if (!hasSeenIntro(initialView)) setIntroOpen(true);
  }, [initialView]);

  function closeIntro() {
    markIntroSeen(viewRef.current);
    setIntroOpen(false);
  }

  useEffect(() => {
    const unsubscribe = bridge.subscribe((event: OfficeEvent) => {
      switch (event.type) {
        case 'ready':
          setBooted(true);
          break;

        case 'player_moved':
          setPlayerTile({ x: event.x, y: event.y });
          break;

        case 'prompt':
          setPrompt(
            event.text && event.action
              ? { text: event.text, action: event.action, target: event.target }
              : null,
          );
          break;

        case 'zone_changed': {
          setZoneName(event.room?.name ?? 'Corridor');
          setZoneKey(event.room?.key ?? null);
          const session = viewRef.current?.session;
          if (session && event.room) {
            void logClientEvent(session.id, {
              eventType: 'office_zone_entered',
              metadata: { zoneKey: event.room.key, zoneName: event.room.name },
            });
          }
          break;
        }

        case 'interact_npc':
          // Keys still reach the game behind the intro; it must not act on them.
          if (!introOpenRef.current) handleNpc(event.npc);
          break;

        case 'interact_zone': {
          if (introOpenRef.current) break;
          const action = event.room.action;
          if (action.kind === 'resources') setOverlay({ kind: 'resources' });
          else if (action.kind === 'notifications') setOverlay({ kind: 'notifications' });
          else if (action.kind === 'workspace') {
            const session = viewRef.current?.session;
            if (session) router.push(`/workspace/${session.id}`);
            else setOverlay(noSessionMessage());
          }
          else if (action.kind === 'meeting') openMeeting();
          break;
        }

        default:
          break;
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge, router]);

  function noSessionMessage(): Overlay {
    return {
      kind: 'message',
      title: 'No active bootcamp',
      body: 'Start the Sales bootcamp from the departments page, then come back — your desk, the Data Room and the meeting rooms will be wired to that session.',
    };
  }

  /**
   * Resolves which step a persona conversation belongs to: prefer the step the
   * student is actually on if it uses this persona, otherwise the NPC default.
   */
  function resolveStep(personaKey: string, fallback: string | null): string | null {
    const current = viewRef.current;
    if (!current) return fallback;
    const matching = current.steps.filter((step) =>
      step.tasks.some((task) => task.personaKey === personaKey),
    );
    const live = matching.find(
      (step) => step.unlocked && step.status !== 'completed',
    );
    return live?.key ?? fallback;
  }

  function handleNpc(npc: OfficeNpc) {
    const current = viewRef.current;

    if (current) {
      void logClientEvent(current.session.id, {
        eventType: 'npc_interaction_started',
        metadata: { npcKey: npc.key, personaKey: npc.personaKey },
      });
    }

    if (!npc.personaKey) {
      setOverlay({
        kind: 'message',
        title: npc.name,
        body: 'Welcome to BITE. Your desk is in the south-west corner, the Data Room holds every document you are allowed to read, and meetings happen in Meeting Room A.',
      });
      return;
    }

    if (!current) {
      setOverlay(noSessionMessage());
      return;
    }

    const stepKey = resolveStep(npc.personaKey, npc.stepKey);
    if (!stepKey) {
      setOverlay(noSessionMessage());
      return;
    }

    const step = current.steps.find((s) => s.key === stepKey);
    if (!step?.unlocked) {
      setOverlay({
        kind: 'message',
        title: npc.name,
        body:
          step?.lockedReason ??
          'This conversation is not available yet in your current scenario.',
      });
      return;
    }

    setOverlay({ kind: 'chat', personaKey: npc.personaKey, stepKey });
  }

  function openMeeting() {
    const current = viewRef.current;
    if (!current) {
      setOverlay(noSessionMessage());
      return;
    }
    const meetingStep = current.steps.find(
      (step) =>
        step.stepType === 'ai_interaction' &&
        step.unlocked &&
        step.status !== 'completed',
    );
    const personaKey = meetingStep?.tasks.find((t) => t.personaKey)?.personaKey;
    if (!meetingStep || !personaKey) {
      setOverlay({
        kind: 'message',
        title: 'Meeting Room A',
        body: 'There is no meeting scheduled right now. Check your step list in the workspace.',
      });
      return;
    }
    setOverlay({ kind: 'chat', personaKey, stepKey: meetingStep.key });
  }

  const activePersona =
    overlay.kind === 'chat'
      ? view?.personas.find((p) => p.key === overlay.personaKey)
      : undefined;

  const chatTask =
    overlay.kind === 'chat'
      ? view?.steps
          .find((s) => s.key === overlay.stepKey)
          ?.tasks.find((t) => t.personaKey === overlay.personaKey)
      : undefined;

  const currentStep = view?.steps.find((s) => s.key === view.session.currentStepKey);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl border border-line shadow-card">
          <OfficeCanvas bridge={bridge} />

          {/* Vignette keeps the eye on the avatar rather than the canvas edges. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              boxShadow:
                'inset 0 0 0 1px rgba(15,23,41,0.06), inset 0 0 90px rgba(15,23,41,0.28)',
            }}
          />

          <div className="pointer-events-none absolute left-4 top-4 flex flex-col items-start gap-2">
            <span className="flex items-center gap-2 rounded-lg bg-[#1d2433]/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-float">
              <span className="size-1.5 rounded-full bg-brand-400" aria-hidden />
              {zoneName}
            </span>
            <span className="hidden rounded-lg bg-[#1d2433]/70 px-3 py-1 text-[10px] text-white/75 sm:inline">
              <kbd className="font-mono text-white">WASD</kbd> /{' '}
              <kbd className="font-mono text-white">↑←↓→</kbd> to move
            </span>
          </div>

          <MissionBanner view={view} currentStep={currentStep} />

          {view && currentStep ? <TodaysTasks step={currentStep} /> : null}

          <div className="pointer-events-none absolute bottom-4 right-4 w-[190px] rounded-xl bg-[#1d2433]/85 p-2 shadow-float">
            <Minimap player={playerTile} activeRoomKey={zoneKey} />
          </div>

          {prompt ? (
            <div
              className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2"
              data-testid="office-prompt"
            >
              <span className="flex animate-pop items-center gap-2.5 rounded-xl border border-white/10 bg-[#1d2433]/95 py-1.5 pl-1.5 pr-4 text-sm font-medium text-white shadow-float">
                <kbd className="grid size-7 place-items-center rounded-lg border border-brand-400 bg-[#141a26] font-mono text-xs font-semibold text-brand-300">
                  E
                </kbd>
                <span className="sr-only">{prompt.text}</span>
                <span aria-hidden>
                  {prompt.action}
                  {prompt.target ? ` to ${prompt.target}` : ''}
                </span>
              </span>
            </div>
          ) : null}

          {introOpen ? <OfficeIntro view={view} onDone={closeIntro} /> : null}

          {!booted ? (
            <div className="absolute inset-0 grid place-items-center bg-surface/95">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-brand-400" />
                Entering the office…
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-sunken px-4 py-2.5">
          <p className="text-[11px] leading-relaxed text-muted">
            Walk to <strong className="text-strong">My Desk</strong> to open your
            workspace, the <strong className="text-strong">Data Room</strong> to browse
            files, or <strong className="text-strong">Meeting Room A</strong> to meet the
            buyer. Press{' '}
            <kbd className="rounded border border-line bg-sunken px-1 py-px font-mono text-[10px] text-strong">
              E
            </kbd>{' '}
            when prompted.{' '}
            <button
              type="button"
              onClick={() => setIntroOpen(true)}
              className="font-medium text-brand-400 underline-offset-4 hover:underline"
            >
              Replay intro
            </button>
          </p>
          {view ? (
            <Link
              href={`/workspace/${view.session.id}`}
              className="shrink-0 text-[11px] font-medium text-brand-400 underline-offset-4 hover:underline"
            >
              Open workspace →
            </Link>
          ) : (
            <Link
              href="/departments"
              className="shrink-0 text-[11px] font-medium text-brand-400 underline-offset-4 hover:underline"
            >
              Start a bootcamp →
            </Link>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        {overlay.kind === 'none' ? (
          <Card>
            <CardHeader
              title={view ? view.department.projectTitle : 'Visiting BITE'}
              subtitle={
                view
                  ? `Current step: ${currentStep?.title ?? '—'}`
                  : 'No active bootcamp'
              }
            />
            <div className="px-5 py-4">
              {view ? (
                <ol className="space-y-1.5">
                  {view.steps.map((step, index) => (
                    <li key={step.key} className="flex items-center gap-2.5 text-[11px]">
                      <span
                        className={`grid size-[18px] shrink-0 place-items-center rounded-full border text-[9px] font-semibold ${
                          step.status === 'completed'
                            ? 'border-accent-400/40 bg-accent-400/15 text-accent-400'
                            : step.key === view.session.currentStepKey
                              ? 'border-brand-400 bg-brand-500 text-white'
                              : step.unlocked
                                ? 'border-line bg-sunken text-muted'
                                : 'border-line bg-surface text-subtle'
                        }`}
                      >
                        {step.status === 'completed' ? '✓' : index + 1}
                      </span>
                      <span
                        className={
                          step.status === 'completed'
                            ? 'text-muted'
                            : step.unlocked
                              ? 'text-strong'
                              : 'text-subtle'
                        }
                      >
                        {step.title}
                      </span>
                      {step.officeZoneKey && step.unlocked && step.status !== 'completed' ? (
                        <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wider text-brand-400">
                          here
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState>
                  You are exploring the office as a visitor. Start the Sales bootcamp to
                  wire the desk, Data Room and meeting rooms to a real session.
                </EmptyState>
              )}
            </div>
          </Card>
        ) : null}

        {overlay.kind === 'resources' && view ? (
          <div className="space-y-2">
            <OverlayHeader title="Data Room" onClose={() => setOverlay({ kind: 'none' })} />
            <ResourcePanel
              sessionId={view.session.id}
              resources={view.resources}
              stepKey={view.session.currentStepKey}
            />
          </div>
        ) : null}

        {overlay.kind === 'resources' && !view ? (
          <Card className="p-5">
            <EmptyState>Start a bootcamp to open the Data Room.</EmptyState>
          </Card>
        ) : null}

        {overlay.kind === 'chat' && view && activePersona ? (
          <div className="space-y-2">
            <OverlayHeader
              title={`Meeting — ${activePersona.name}`}
              onClose={() => setOverlay({ kind: 'none' })}
            />
            <ChatPanel
              sessionId={view.session.id}
              stepKey={overlay.stepKey}
              persona={activePersona}
              minStudentMessages={chatTask?.minStudentMessages ?? 0}
              onSessionUpdate={setView}
            />
          </div>
        ) : null}

        {overlay.kind === 'notifications' ? (
          <div className="space-y-2">
            <OverlayHeader
              title="Notification Area"
              onClose={() => setOverlay({ kind: 'none' })}
            />
            <Card className="p-5">
              {view?.steps.find((s) => s.eventPayload && s.unlocked) ? (
                (() => {
                  const step = view.steps.find((s) => s.eventPayload && s.unlocked)!;
                  return (
                    <div>
                      <Badge tone="warn">{step.title}</Badge>
                      <h3 className="mt-3 text-sm font-semibold text-strong">
                        {step.eventPayload!.headline}
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-body">
                        {step.eventPayload!.body}
                      </p>
                      <Link
                        href={`/workspace/${view.session.id}`}
                        className="mt-4 inline-block text-[11px] text-brand-400 underline-offset-4 hover:underline"
                      >
                        Respond in your workspace →
                      </Link>
                    </div>
                  );
                })()
              ) : (
                <EmptyState>No messages waiting.</EmptyState>
              )}
            </Card>
          </div>
        ) : null}

        {overlay.kind === 'message' ? (
          <div className="space-y-2">
            <OverlayHeader title={overlay.title} onClose={() => setOverlay({ kind: 'none' })} />
            <Card className="p-5">
              <p className="text-sm leading-relaxed text-body">{overlay.body}</p>
            </Card>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

/**
 * The mission plate at the top of the office: which step the student is on,
 * named the way the department would name it. In visitor mode it says so.
 */
function MissionBanner({
  view,
  currentStep,
}: {
  view: SessionView | null;
  currentStep: SessionView['steps'][number] | undefined;
}) {
  const index = view && currentStep ? view.steps.indexOf(currentStep) + 1 : 0;
  const eyebrow = view
    ? currentStep
      ? `${view.department.name} mission ${String(index).padStart(2, '0')}`
      : `${view.department.name} · all steps complete`
    : 'Visitor mode';
  const title = view
    ? (currentStep?.title ?? view.scenario.finalOutputTitle)
    : 'Explore the BITE office';

  const body = (
    <span className="flex items-center gap-3 rounded-xl border border-white/70 bg-surface/95 py-2 pl-2.5 pr-4 shadow-float">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"
      >
        <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <rect x="4" y="3.5" width="12" height="14" rx="2" />
          <path d="M7.5 3.5V2.5h5v1M7 13v-2M10 13V8.5M13 13v-3.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-brand-600">
          {eyebrow}
        </span>
        <span className="block truncate text-sm font-semibold text-strong">{title}</span>
      </span>
      {view ? <span aria-hidden className="text-subtle">›</span> : null}
    </span>
  );

  return (
    <div
      className="absolute left-1/2 top-4 max-w-[min(440px,calc(100%-2rem))] -translate-x-1/2 max-md:top-24"
      data-testid="office-mission"
    >
      {view ? (
        <Link href={`/workspace/${view.session.id}`} className="block">
          {body}
        </Link>
      ) : (
        <div className="pointer-events-none">{body}</div>
      )}
    </div>
  );
}

/** The current step's tasks as a checklist, ticked as they are completed. */
function TodaysTasks({ step }: { step: SessionView['steps'][number] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="absolute right-4 top-4 w-[230px] overflow-hidden rounded-xl border-2 border-[#1d2433] bg-surface/95 shadow-float max-md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 bg-[#1d2433] px-3 py-2 text-left text-xs font-semibold text-white"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="size-4 text-warn-400" fill="none" stroke="currentColor" strokeWidth={1.7}>
          <rect x="3" y="4" width="14" height="13" rx="2" />
          <path d="M3 8h14M7 2.5v3M13 2.5v3" strokeLinecap="round" />
        </svg>
        <span className="flex-1">Today&apos;s Tasks</span>
        <span aria-hidden className={`text-[10px] transition-transform ${open ? '' : 'rotate-180'}`}>
          ▲
        </span>
      </button>
      {open ? (
        <ul className="divide-y divide-line px-3 py-1">
          {step.tasks.length === 0 ? (
            <li className="py-2 text-[11px] text-muted">{step.title}</li>
          ) : (
            step.tasks.map((task) => {
              const done = task.status === 'complete';
              return (
                <li key={task.key} className="flex items-center gap-2.5 py-2">
                  <span
                    aria-hidden
                    className={`grid size-4 shrink-0 place-items-center rounded border text-[10px] font-bold ${
                      done
                        ? 'border-accent-500 bg-accent-500 text-white'
                        : task.status === 'draft'
                          ? 'border-brand-400 bg-brand-50'
                          : 'border-line-strong bg-surface'
                    }`}
                  >
                    {done ? '✓' : ''}
                  </span>
                  <span
                    className={`text-xs ${done ? 'text-muted line-through' : 'text-strong'}`}
                  >
                    {task.title}
                    <span className="sr-only">{done ? ' (done)' : ''}</span>
                  </span>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

function OverlayHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </h2>
      <Button variant="ghost" onClick={onClose} className="px-2 py-1 text-[11px]">
        Close
      </Button>
    </div>
  );
}
