import type { ConversationView } from '@/types/ai';
import type { SessionView } from '@/types/session-view';
import type { GuardrailWarning } from '@/services/scenario/guardrails';
import type { BehaviorEvent } from '@/types/runtime';

/** Typed fetch helpers for the student client. */

async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${response.status})`);
  }
  return data as T;
}

export function saveTask(
  sessionId: string,
  taskKey: string,
  value: unknown,
  status: 'draft' | 'submitted',
) {
  return post<{ view: SessionView; warnings: GuardrailWarning[] }>(
    `/api/sessions/${sessionId}/tasks/${encodeURIComponent(taskKey)}`,
    { value, status },
  );
}

export function startStep(sessionId: string, stepKey: string) {
  return post<{ ok: true }>(
    `/api/sessions/${sessionId}/steps/${encodeURIComponent(stepKey)}/start`,
  );
}

export function conversationAction(
  sessionId: string,
  body: {
    personaKey: string;
    stepKey: string;
    action: 'open' | 'send' | 'end';
    message?: string;
  },
) {
  return post<{ conversation: ConversationView; view?: SessionView }>(
    `/api/sessions/${sessionId}/conversations`,
    body,
  );
}

export function logResourceOpen(
  sessionId: string,
  resourceKey: string,
  stepKey: string | null,
) {
  return post<{ ok: true }>(
    `/api/sessions/${sessionId}/resources/${encodeURIComponent(resourceKey)}/open`,
    { stepKey },
  ).catch(() => ({ ok: true as const }));
}

export function logClientEvent(
  sessionId: string,
  body: {
    eventType:
      | 'resource_opened'
      | 'resource_closed'
      | 'task_started'
      | 'unexpected_event_viewed'
      | 'office_zone_entered'
      | 'npc_interaction_started';
    stepKey?: string | null;
    taskKey?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  // Behavior logging must never interrupt the student's work.
  return post<{ ok: true }>(`/api/sessions/${sessionId}/events`, body).catch(
    () => ({ ok: true as const }),
  );
}

export async function fetchSessionView(sessionId: string): Promise<SessionView> {
  const response = await fetch(`/api/sessions/${sessionId}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Could not load session');
  return (data as { view: SessionView }).view;
}

export async function fetchEvents(sessionId: string): Promise<BehaviorEvent[]> {
  const response = await fetch(`/api/sessions/${sessionId}/events?limit=500`, {
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Could not load events');
  return (data as { events: BehaviorEvent[] }).events;
}
