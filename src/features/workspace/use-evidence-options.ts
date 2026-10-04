'use client';

import { useEffect, useState } from 'react';
import type { ResourceDefinition } from '@/types/resource';
import type { TaskField } from '@/types/scenario';
import type { EvidenceOption } from './field-input';

/**
 * Builds the selectable evidence list for `resource_evidence` fields from the
 * sources the scenario content declares — Data Room resources and/or what a
 * persona actually said in a given step.
 */
export function useEvidenceOptions(
  sessionId: string,
  fields: TaskField[],
  resources: ResourceDefinition[],
): EvidenceOption[] {
  const [options, setOptions] = useState<EvidenceOption[]>([]);

  const evidenceFields = fields.filter((f) => f.type === 'resource_evidence');
  const signature = JSON.stringify(
    evidenceFields.flatMap((f) => f.evidenceSources ?? []),
  );

  useEffect(() => {
    let cancelled = false;
    const sources = JSON.parse(signature) as NonNullable<TaskField['evidenceSources']>;
    if (sources.length === 0) {
      setOptions([]);
      return;
    }

    async function load() {
      const collected: EvidenceOption[] = [];

      for (const source of sources) {
        if (source.kind === 'resources') {
          collected.push(
            ...resources.map((resource) => ({
              value: `resource:${resource.key}`,
              label: resource.title,
              group: 'Data Room',
            })),
          );
          continue;
        }

        try {
          const params = new URLSearchParams({
            personaKey: source.personaKey,
            stepKey: source.stepKey,
          });
          const response = await fetch(
            `/api/sessions/${sessionId}/conversations?${params}`,
            { cache: 'no-store' },
          );
          if (!response.ok) continue;
          const data = (await response.json()) as {
            conversation: {
              messages: Array<{ id: string; role: string; content: string }>;
            };
          };
          collected.push(
            ...data.conversation.messages
              .filter((m) => m.role === 'persona')
              .map((m) => ({
                value: `message:${m.id}`,
                label:
                  m.content.length > 90 ? `${m.content.slice(0, 90)}…` : m.content,
                group: 'What the buyer said',
              })),
          );
        } catch {
          // Evidence linking is optional; a failure must not block the form.
        }
      }

      if (!cancelled) setOptions(collected);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, signature, resources]);

  return options;
}
