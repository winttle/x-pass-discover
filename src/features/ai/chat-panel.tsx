'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, CardHeader, inputClass, Spinner } from '@/components/ui';
import { useToast } from '@/components/toast';
import { Portrait } from '@/components/media';
import { conversationAction } from '@/lib/client-api';
import type { ConversationView, PublicPersona } from '@/types/ai';
import type { SessionView } from '@/types/session-view';

/**
 * AI conversation panel.
 *
 * The client never sees hidden facts, disclosure rules or the system prompt.
 * What it receives is the persona's reply plus the LABELS of facts this reply
 * disclosed, so the student can see that asking a good question earned
 * something concrete — the discovery counter is the feedback loop that teaches
 * the mechanic.
 */
export function ChatPanel({
  sessionId,
  stepKey,
  persona,
  minStudentMessages,
  onSessionUpdate,
  readOnly,
}: {
  sessionId: string;
  stepKey: string;
  persona: PublicPersona;
  minStudentMessages: number;
  onSessionUpdate: (view: SessionView) => void;
  readOnly?: boolean;
}) {
  const [conversation, setConversation] = useState<ConversationView | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const discoveredRef = useRef(0);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    conversationAction(sessionId, { personaKey: persona.key, stepKey, action: 'open' })
      .then((data) => {
        if (cancelled) return;
        discoveredRef.current = data.conversation.discoveredFactCount;
        setConversation(data.conversation);
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : 'Could not open the conversation',
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [sessionId, persona.key, stepKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [conversation?.messages.length, sending]);

  function applyConversation(next: ConversationView) {
    const gained = next.discoveredFactCount - discoveredRef.current;
    if (gained > 0) {
      const labels = next.messages.at(-1)?.revealedFactLabels ?? [];
      toast.push({
        tone: 'success',
        title: gained === 1 ? 'You uncovered something' : `You uncovered ${gained} things`,
        description: labels.join(' · ') || undefined,
      });
    }
    discoveredRef.current = next.discoveredFactCount;
    setConversation(next);
  }

  async function send() {
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);
    setDraft('');
    try {
      const data = await conversationAction(sessionId, {
        personaKey: persona.key,
        stepKey,
        action: 'send',
        message,
      });
      applyConversation(data.conversation);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send the message');
      setDraft(message);
    } finally {
      setSending(false);
    }
  }

  async function end() {
    setEnding(true);
    setError(null);
    try {
      const data = await conversationAction(sessionId, {
        personaKey: persona.key,
        stepKey,
        action: 'end',
      });
      setConversation(data.conversation);
      if (data.view) onSessionUpdate(data.view);
      toast.push({ tone: 'info', title: 'Conversation ended', description: 'Your transcript is preserved.' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not end the conversation');
    } finally {
      setEnding(false);
    }
  }

  const sent = conversation?.studentMessageCount ?? 0;
  const remaining = Math.max(0, minStudentMessages - sent);
  const ended = conversation?.status === 'ended';
  const canEnd = remaining === 0 && !ended;
  const found = conversation?.discoveredFactCount ?? 0;
  const total = conversation?.totalDiscoverableFactCount ?? 0;

  return (
    <Card className="flex h-[640px] flex-col overflow-hidden">
      <CardHeader
        title={
          <span className="flex items-center gap-2.5">
            <Avatar persona={persona} size={32} />
            {persona.name}
          </span>
        }
        subtitle={`${persona.role} · ${persona.organization}`}
        right={
          <div className="flex items-center gap-1.5">
            {ended ? (
              <Badge tone="muted" dot>
                Ended
              </Badge>
            ) : (
              <Badge tone="success" dot>
                Live
              </Badge>
            )}
          </div>
        }
      />

      <div className="space-y-2.5 border-b border-line bg-sunken px-5 py-3">
        <p className="text-[11px] leading-relaxed text-muted">
          {persona.visibleContext}
        </p>
        {total > 0 ? <DiscoveryMeter found={found} total={total} /> : null}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-surface to-transparent"
        />
        <div ref={scrollRef} className="h-full space-y-3 overflow-y-auto px-5 py-4">
        {!conversation ? (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Spinner /> Connecting…
          </div>
        ) : null}

        {conversation?.messages.map((message) => {
          const isStudent = message.role === 'student';
          return (
            <div
              key={message.id}
              className={`flex animate-fade-up gap-2.5 ${isStudent ? 'justify-end' : 'justify-start'}`}
            >
              {!isStudent ? <Avatar persona={persona} className="mt-0.5" /> : null}
              <div className={`max-w-[82%] ${isStudent ? 'items-end' : ''}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    isStudent
                      ? 'rounded-br-md bg-brand-600 text-white'
                      : 'rounded-bl-md border border-line bg-sunken text-strong'
                  }`}
                >
                  {message.content}
                </div>
                {message.revealedFactLabels?.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {message.revealedFactLabels.map((label) => (
                      <Badge key={label} tone="success" className="animate-pop">
                        ✦ {label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {sending ? (
          <div className="flex gap-2.5">
            <Avatar persona={persona} className="mt-0.5" />
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-sunken px-4 py-3.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full bg-subtle"
                  style={{
                    animation: 'dot-pulse 1.3s ease-in-out infinite',
                    animationDelay: `${i * 0.16}s`,
                  }}
                />
              ))}
            </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="border-t border-danger-400/30 bg-danger-400/10 px-5 py-2 text-[11px] text-danger-400">
          {error}
        </p>
      ) : null}

      <div className="border-t border-line bg-surface px-5 py-3">
        {ended ? (
          <p className="text-xs text-muted">
            This conversation has ended. Your transcript is preserved.
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <textarea
                rows={2}
                className={inputClass}
                value={draft}
                disabled={readOnly || sending}
                placeholder="Ask a question that could change your proposal…"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button
                onClick={send}
                disabled={readOnly || sending || !draft.trim()}
                className="self-stretch"
              >
                Send
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-muted">
                <kbd className="rounded border border-line bg-sunken px-1 py-px font-mono text-[9px]">
                  ⌘/Ctrl
                </kbd>
                {' + '}
                <kbd className="rounded border border-line bg-sunken px-1 py-px font-mono text-[9px]">
                  ↵
                </kbd>{' '}
                to send
                {remaining > 0
                  ? ` · ${remaining} more question${remaining === 1 ? '' : 's'} before you can end this`
                  : ' · you can end this whenever you are ready'}
              </p>
              <Button variant="secondary" size="sm" onClick={end} disabled={!canEnd} loading={ending}>
                End meeting
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function Avatar({
  persona,
  className,
  size = 26,
}: {
  persona: PublicPersona;
  className?: string;
  size?: number;
}) {
  return (
    <Portrait
      src={persona.portrait}
      alt={persona.name}
      size={size}
      ring={persona.avatarColor}
      className={className}
    />
  );
}

/** Shows what the student has earned by asking well — never a score. */
function DiscoveryMeter({ found, total }: { found: number; total: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-medium uppercase tracking-wider text-muted">
          Specifics uncovered
        </span>
        <span className="font-mono text-body">
          {found}/{total}
        </span>
      </div>
      <div className="mt-1.5 flex gap-1">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
              index < found ? 'bg-accent-400' : 'bg-sunken'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
