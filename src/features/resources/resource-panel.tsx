'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Badge, Card, CardHeader, EmptyState } from '@/components/ui';
import { FileIcon } from '@/components/media';
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

  const illustration = resource.image ? (
    <div className="relative mb-4 h-36 overflow-hidden rounded-xl border border-line bg-sunken">
      <Image
        src={resource.image.src}
        alt={resource.image.alt}
        fill
        unoptimized
        sizes="(max-width: 768px) 100vw, 340px"
        className="object-cover"
      />
    </div>
  ) : null;

  if (body.kind === 'markdown') {
    return (
      <>
        {illustration}
        <Markdown source={body.markdown} />
      </>
    );
  }

  if (body.kind === 'table') {
    return (
      <div>
        {illustration}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {body.columns.map((column) => (
                  <th
                    key={column}
                    className="border-b border-line px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted"
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
                      className="border-b border-line px-2 py-1.5 text-body"
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
          <p className="mt-3 rounded-lg border border-line bg-sunken px-3 py-2 text-[11px] leading-relaxed text-muted">
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
        <ul className="divide-y divide-line">
          {ordered.map((resource) => {
            const isOpen = openKey === resource.key;
            return (
              <li key={resource.key}>
                <button
                  type="button"
                  onClick={() => toggle(resource)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken"
                >
                  <FileIcon format={resource.fileMeta?.format ?? 'DOC'} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium text-strong">
                        {resource.title}
                      </span>
                      {highlighted.has(resource.key) ? (
                        <Badge tone="brand">for this step</Badge>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                      {resource.description}
                    </span>
                    <span className="mt-1 block text-[10px] font-medium uppercase tracking-wider text-subtle">
                      {resource.fileMeta?.detail ??
                        TYPE_LABELS[resource.resourceType] ??
                        resource.resourceType}
                    </span>
                  </span>
                  <span className="mt-1 shrink-0 text-subtle">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen ? (
                  <div className="border-t border-line bg-sunken px-5 py-4">
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
