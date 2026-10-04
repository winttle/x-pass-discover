'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import type { DepartmentDefinition } from '@/types/scenario';

type SessionSummary = { id: string; departmentSlug: string; status: string };

export function DepartmentChooser({
  departments,
  initialSelection,
  sessions,
}: {
  departments: DepartmentDefinition[];
  initialSelection: string[];
  sessions: SessionSummary[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelection);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionFor = (slug: string) =>
    sessions.find((s) => s.departmentSlug === slug) ?? null;

  function toggle(slug: string) {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 3) return prev;
      return [...prev, slug];
    });
  }

  async function saveSelection() {
    setBusy('selection');
    setError(null);
    try {
      const response = await fetch('/api/departments/selection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ departmentSlugs: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save selection');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save selection');
    } finally {
      setBusy(null);
    }
  }

  async function startBootcamp(slug: string) {
    setBusy(slug);
    setError(null);
    try {
      const existing = sessionFor(slug);
      if (existing) {
        router.push(`/workspace/${existing.id}`);
        return;
      }
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ departmentSlug: slug }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not start the bootcamp');
      router.push(`/workspace/${data.session.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the bootcamp');
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-800 bg-ink-900/50 px-4 py-3">
        <p className="text-xs text-ink-400">
          Selected <span className="font-semibold text-white">{selected.length}</span> of 3.
          Sales is playable in this build; the others are scaffolded on the same engine.
        </p>
        <Button
          variant="secondary"
          onClick={saveSelection}
          disabled={busy === 'selection' || selected.length === 0}
        >
          {busy === 'selection' ? 'Saving…' : 'Save selection'}
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-danger-400/30 bg-danger-400/10 px-3 py-2 text-xs text-danger-400">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {departments.map((department) => {
          const isSelected = selected.includes(department.slug);
          const session = sessionFor(department.slug);
          const playable = department.status === 'playable';

          return (
            <Card
              key={department.slug}
              className={`flex flex-col transition-colors ${
                isSelected ? 'border-brand-500/60' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(department.slug)}
                className="flex-1 cursor-pointer p-5 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: department.accentColor }}
                  >
                    {department.name}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {playable ? (
                      <Badge tone="success">Playable</Badge>
                    ) : (
                      <Badge tone="muted">Coming soon</Badge>
                    )}
                    <span
                      className={`grid size-5 place-items-center rounded-md border text-[10px] ${
                        isSelected
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-ink-600 text-transparent'
                      }`}
                      aria-hidden
                    >
                      ✓
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-sm font-medium text-white">
                  {department.projectTitle}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-400">
                  {department.description}
                </p>

                <dl className="mt-4 space-y-1.5 border-t border-ink-800 pt-3 text-[11px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-500">Core question</dt>
                    <dd className="text-right text-ink-300">{department.coreQuestion}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-500">Final output</dt>
                    <dd className="text-right text-ink-300">{department.finalOutput}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-500">Starting point</dt>
                    <dd className="text-right text-ink-300">
                      {department.productKey ? 'Product exists' : 'No product yet'}
                    </dd>
                  </div>
                </dl>
              </button>

              <div className="border-t border-ink-800 px-5 py-3.5">
                {playable ? (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => startBootcamp(department.slug)}
                      disabled={busy === department.slug}
                      className="flex-1"
                    >
                      {busy === department.slug
                        ? 'Opening…'
                        : session
                          ? 'Resume bootcamp'
                          : 'Start bootcamp'}
                    </Button>
                    {session ? <Badge tone="brand">{session.status}</Badge> : null}
                  </div>
                ) : (
                  <p className="text-[11px] text-ink-500">
                    Scenario content not authored yet — the engine already supports it.
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Link
          href="/office"
          className="text-xs text-ink-400 underline-offset-4 hover:text-white hover:underline"
        >
          Or walk into the 2D office first →
        </Link>
      </div>
    </div>
  );
}
