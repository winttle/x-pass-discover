'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, CardHeader, inputClass } from '@/components/ui';
import { conversationAction } from '@/lib/client-api';
import type { ConversationView, PublicPersona } from '@/types/ai';
import type { SessionView } from '@/types/session-view';

/**
 * AI conversation panel.
 *
 * The client never sees hidden facts, disclosure rules or the system prompt.
 * What it receives is the persona's reply plus the LABELS of facts this reply
 * disclosed, so the student can see that asking a good question earned
 * something concrete.
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
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    conversationAction(sessionId, { personaKey: persona.key, stepKey, action: 'open' })
      .then((data) => {
        if (!cancelled) setConversation(data.conversation);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Could not open the conversation'),
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
      setConversation(data.conversation);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send the message');
      setDraft(message);
    } finally {
      setSending(false);
    }
  }

  async function end() {
    setSending(true);
    setError(null);
    try {
      const data = await conversationAction(sessionId, {
        personaKey: persona.key,
        stepKey,
        action: 'end',
      });
      setConversation(data.conversation);
      if (data.view) onSessionUpdate(data.view);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not end the conversation');
    } finally {
      setSending(false);
    }
  }

  const sent = conversation?.studentMessageCount ?? 0;
  const remaining = Math.max(0, minStudentMessages - sent);
  const ended = conversation?.status === 'ended';
  const canEnd = remaining === 0 && !ended;

  return (
    <Card className="flex h-[620px] flex-col overflow-hidden">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span
              className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: persona.avatarColor }}
            >
              {persona.name.slice(0, 1)}
            </span>
            {persona.name}
          </span>
        }
        subtitle={`${persona.role} · ${persona.organization}`}
        right={
          <div className="flex items-center gap-1.5">
            {ended ? <Badge tone="muted">Ended</Badge> : <Badge tone="success">Live</Badge>}
            {conversation ? (
              <Badge
                tone="brand"
                title="Specific facts you have uncovered by asking relevant questions"
              >
                {conversation.discoveredFactCount}/{conversation.totalDiscoverableFactCount} found
              </Badge>
            ) : null}
          </div>
        }
      />

      <div className="border-b border-ink-800 bg-ink-950/40 px-5 py-2.5">
        <p className="text-[11px] leading-relaxed text-ink-400">
          {persona.visibleContext}
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {!conversation ? (
          <p className="text-xs text-ink-500">Connecting…</p>
        ) : null}

        {conversation?.messages.map((message) => {
          const isStudent = message.role === 'student';
          return (
            <div
              key={message.id}
              className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${isStudent ? 'items-end' : ''}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isStudent
                      ? 'bg-brand-500 text-white'
                      : 'border border-ink-800 bg-ink-950/60 text-ink-200'
                  }`}
                >
                  {message.content}
                </div>
                {message.revealedFactLabels?.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {message.revealedFactLabels.map((label) => (
                      <Badge key={label} tone="success">
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
          <div className="flex justify-start">
            <div className="rounded-2xl border border-ink-800 bg-ink-950/60 px-3.5 py-2.5 text-sm text-ink-500">
              …
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="border-t border-danger-400/30 bg-danger-400/10 px-5 py-2 text-[11px] text-danger-400">
          {error}
        </p>
      ) : null}

      <div className="border-t border-ink-800 px-5 py-3">
        {ended ? (
          <p className="text-xs text-ink-500">
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
              <Button onClick={send} disabled={readOnly || sending || !draft.trim()}>
                Send
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[10px] text-ink-500">
                ⌘/Ctrl + Enter to send.{' '}
                {remaining > 0
                  ? `${remaining} more question${remaining === 1 ? '' : 's'} before you can end this.`
                  : 'You can end this whenever you are ready.'}
              </p>
              <Button variant="secondary" onClick={end} disabled={!canEnd || sending}>
                End meeting
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
