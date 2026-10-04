'use client';

import { useState } from 'react';
import { Badge, Card, CardHeader, EmptyState } from '@/components/ui';
import { Markdown } from '@/components/markdown';
import { logResourceOpen } from '@/lib/client-api';
import type { ResourceDefinition } from '@/types/resource';

const TYPE_LABELS: Record<string, string> = {
  training: 'Training',
  company_profile: 'Company',
  product_sheet: 'Product',
  account_profile: 'Account',
  data_table: 'Data',
  memo: 'Memo',
  policy: 'Policy',
  file: 'File',
  image: 'Image',
};

function ResourceBodyView({ resource }: { resource: ResourceDefinition }) {
  const body = resource.body;

  if (body.kind === 'markdown') return <Markdown source={body.markdown} />;

  if (body.kind === 'table') {
    return (
      <div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {body.columns.map((column) => (
                  <th
                    key={column}
                    className="border-b border-ink-700 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-400"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border-b border-ink-800 px-2 py-1.5 text-ink-300"
                    >
                      {String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {body.note ? (
          <p className="mt-3 rounded-lg border border-ink-800 bg-ink-950/50 px-3 py-2 text-[11px] leading-relaxed text-ink-400">
            {body.note}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <a
      href={body.url}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-brand-400 underline-offset-4 hover:underline"
    >
      Open file ({body.mimeType})
    </a>
  );
}

/**
 * The Data Room. Opening a resource logs a behavior event — which resources a
 * student reads, and in what order, is context for later evaluation. The count
 * itself is never a score.
 */
export function ResourcePanel({
  sessionId,
  resources,
  highlightKeys,
  stepKey,
  title = 'Data Room',
}: {
  sessionId: string;
  resources: ResourceDefinition[];
  highlightKeys?: string[];
  stepKey: string | null;
  title?: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const highlighted = new Set(highlightKeys ?? []);
  const ordered = [...resources].sort((a, b) => {
    const aScore = highlighted.has(a.key) ? 0 : 1;
    const bScore = highlighted.has(b.key) ? 0 : 1;
    return aScore - bScore || a.sortOrder - b.sortOrder;
  });

  function toggle(resource: ResourceDefinition) {
    const next = openKey === resource.key ? null : resource.key;
    setOpenKey(next);
    if (next) void logResourceOpen(sessionId, resource.key, stepKey);
  }

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={`${resources.length} resources · open anything, any time`}
      />
      {ordered.length === 0 ? (
        <div className="p-5">
          <EmptyState>No resources for this scenario yet.</EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-ink-800">
          {ordered.map((resource) => {
            const isOpen = openKey === resource.key;
            return (
              <li key={resource.key}>
                <button
                  type="button"
                  onClick={() => toggle(resource)}
                  className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-ink-850/40"
                >
                  <span className="mt-0.5 shrink-0">
                    <Badge tone={highlighted.has(resource.key) ? 'brand' : 'muted'}>
                      {TYPE_LABELS[resource.resourceType] ?? resource.resourceType}
                    </Badge>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-white">
                      {resource.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-400">
                      {resource.description}
                    </span>
                  </span>
                  <span className="shrink-0 text-ink-500">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen ? (
                  <div className="border-t border-ink-800 bg-ink-950/40 px-5 py-4">
                    <ResourceBodyView resource={resource} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
