'use client';

import { useEffect } from 'react';
import { Badge, Card } from '@/components/ui';
import { logClientEvent } from '@/lib/client-api';
import type { ScenarioEventPayload } from '@/types/scenario';

/**
 * Unexpected events are structured data, not a text popup — HR will need the
 * same shape for an executive challenging a hiring decision.
 */
export function EventCard({
  sessionId,
  stepKey,
  payload,
}: {
  sessionId: string;
  stepKey: string;
  payload: ScenarioEventPayload;
}) {
  useEffect(() => {
    void logClientEvent(sessionId, {
      eventType: 'unexpected_event_viewed',
      stepKey,
      metadata: { headline: payload.headline },
    });
  }, [sessionId, stepKey, payload.headline]);

  return (
    <Card className="border-warn-400/40 bg-warn-400/5">
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warn">Incoming message</Badge>
          <span className="text-[11px] text-ink-400">{payload.from}</span>
        </div>
        <h3 className="mt-3 text-sm font-semibold text-white">{payload.headline}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-300">
          {payload.body}
        </p>

        {payload.facts?.length ? (
          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            {payload.facts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-lg border border-ink-800 bg-ink-950/50 px-3 py-2"
              >
                <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                  {fact.label}
                </dt>
                <dd className="mt-0.5 text-xs text-ink-200">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </Card>
  );
}
