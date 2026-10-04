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
          handleNpc(event.npc);
          break;

        case 'interact_zone': {
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
        <div className="relative overflow-hidden rounded-2xl border border-ink-700/60 shadow-[0_24px_60px_-30px_rgba(0,0,0,1)]">
          <OfficeCanvas bridge={bridge} />

          {/* Vignette keeps the eye on the avatar rather than the canvas edges. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              boxShadow:
                'inset 0 0 90px 10px rgba(3,6,14,0.45), inset 0 0 0 1px rgba(124,139,176,0.08)',
            }}
          />

          <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-brand-500/40 bg-ink-950/95 px-3 py-1 text-[11px] font-medium text-white">
              {zoneName}
            </span>
            <span className="hidden rounded-full border border-ink-700 bg-ink-950/75 px-3 py-1 text-[10px] text-ink-400 sm:inline">
              <kbd className="font-mono text-ink-200">WASD</kbd> /{' '}
              <kbd className="font-mono text-ink-200">↑←↓→</kbd> to move
            </span>
          </div>

          <div className="pointer-events-none absolute bottom-4 right-4 w-[200px] rounded-xl border border-ink-700/70 bg-ink-950 p-1.5">
            <Minimap player={playerTile} activeRoomKey={zoneKey} />
          </div>

          {prompt ? (
            <div
              className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2"
              data-testid="office-prompt"
            >
              <span className="flex animate-pop items-center gap-2 rounded-full border border-brand-400/50 bg-ink-950/95 px-4 py-2 text-xs font-medium text-white shadow-xl shadow-black/50">
                <kbd className="rounded border border-ink-600 bg-ink-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-950">
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

          {!booted ? (
            <div className="absolute inset-0 grid place-items-center bg-ink-950/90">
              <div className="flex items-center gap-2 text-xs text-ink-400">
                <span className="size-3.5 animate-spin rounded-full border-2 border-ink-600 border-t-brand-400" />
                Entering the office…
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-800 bg-ink-900/50 px-4 py-2.5">
          <p className="text-[11px] leading-relaxed text-ink-400">
            Walk to <strong className="text-ink-200">My Desk</strong> to open your
            workspace, the <strong className="text-ink-200">Data Room</strong> to browse
            files, or <strong className="text-ink-200">Meeting Room A</strong> to meet the
            buyer. Press{' '}
            <kbd className="rounded border border-ink-700 bg-ink-850 px-1 py-px font-mono text-[10px] text-ink-200">
              E
            </kbd>{' '}
            when prompted.
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
                                ? 'border-ink-700 bg-ink-850 text-ink-400'
                                : 'border-ink-800 bg-ink-900 text-ink-600'
                        }`}
                      >
                        {step.status === 'completed' ? '✓' : index + 1}
                      </span>
                      <span
                        className={
                          step.status === 'completed'
                            ? 'text-ink-500'
                            : step.unlocked
                              ? 'text-ink-200'
                              : 'text-ink-600'
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
              minStudentMessages={chatTask?.conversation?.minStudentMessages ?? 0}
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
                      <h3 className="mt-3 text-sm font-semibold text-white">
                        {step.eventPayload!.headline}
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink-300">
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
              <p className="text-sm leading-relaxed text-ink-300">{overlay.body}</p>
            </Card>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function OverlayHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
        {title}
      </h2>
      <Button variant="ghost" onClick={onClose} className="px-2 py-1 text-[11px]">
        Close
      </Button>
    </div>
  );
}
