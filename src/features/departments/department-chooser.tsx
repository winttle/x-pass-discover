'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { Cover } from '@/components/media';
import { useToast } from '@/components/toast';
import type { DepartmentDefinition } from '@/types/scenario';

type SessionSummary = { id: string; departmentSlug: string; status: string };

const GLYPHS: Record<string, string> = {
  marketing: '◆',
  sales: '▲',
  'product-management': '●',
  strategy: '◇',
  'human-resources': '■',
};

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
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>(initialSelection);
  const [busy, setBusy] = useState<string | null>(null);

  const sessionFor = (slug: string) =>
    sessions.find((s) => s.departmentSlug === slug) ?? null;

  function toggle(slug: string) {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 3) {
        toast.push({
          tone: 'warn',
          title: 'Three is the limit',
          description: 'Deselect one before adding another.',
        });
        return prev;
      }
      return [...prev, slug];
    });
  }

  async function saveSelection() {
    setBusy('selection');
    try {
      const response = await fetch('/api/departments/selection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ departmentSlugs: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save selection');
      toast.push({ tone: 'success', title: 'Selection saved' });
      router.refresh();
    } catch (cause) {
      toast.push({
        tone: 'danger',
        title: 'Could not save selection',
        description: cause instanceof Error ? cause.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function startBootcamp(slug: string) {
    setBusy(slug);
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
      toast.push({
        tone: 'danger',
        title: 'Could not start the bootcamp',
        description: cause instanceof Error ? cause.message : undefined,
      });
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-sunken px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={`h-1.5 w-7 rounded-full transition-colors duration-300 ${
                  index < selected.length ? 'bg-brand-500' : 'bg-sunken'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-muted">
            <span className="font-semibold text-strong">{selected.length}</span> of 3
            selected · Sales is playable in this build; the others run on the same engine.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={saveSelection}
          loading={busy === 'selection'}
          disabled={selected.length === 0}
        >
          Save selection
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {departments.map((department) => {
          const isSelected = selected.includes(department.slug);
          const session = sessionFor(department.slug);
          const playable = department.status === 'playable';

          return (
            <Card
              key={department.slug}
              accent={department.accentColor}
              interactive
              className={`flex flex-col transition-shadow duration-200 ${
                isSelected ? 'border-brand-500/60 shadow-lg shadow-brand-600/10' : ''
              }`}
            >
              <Cover
                src={department.coverImage}
                alt=""
                className="h-32 border-b border-line"
                overlay={
                  <>
                    <span
                      className="absolute inset-x-0 bottom-0 h-px"
                      style={{ background: department.accentColor, opacity: 0.35 }}
                    />
                    <span className="absolute right-3 top-3">
                      {playable ? (
                        <Badge tone="success" dot>
                          Playable
                        </Badge>
                      ) : (
                        <Badge tone="muted">Coming soon</Badge>
                      )}
                    </span>
                  </>
                }
              />

              <button
                type="button"
                onClick={() => toggle(department.slug)}
                aria-pressed={isSelected}
                className="flex flex-1 cursor-pointer flex-col p-5 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid size-8 place-items-center rounded-xl text-sm"
                      style={{
                        color: department.accentColor,
                        backgroundColor: `${department.accentColor}1f`,
                      }}
                      aria-hidden
                    >
                      {GLYPHS[department.slug] ?? '◆'}
                    </span>
                    <div>
                      <div
                        className="text-sm font-semibold"
                        style={{ color: department.accentColor }}
                      >
                        {department.name}
                      </div>
                      <div className="text-[11px] text-muted">{department.tagline}</div>
                    </div>
                  </div>

                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-md border text-[10px] transition-all duration-150 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-line-strong text-transparent'
                    }`}
                    aria-hidden
                  >
                    ✓
                  </span>
                </div>

                <p className="mt-4 text-sm font-medium text-strong">
                  {department.projectTitle}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {department.description}
                </p>

                <dl className="mt-auto space-y-1.5 pt-4 text-[11px]">
                  {[
                    ['Core question', department.coreQuestion],
                    ['Final output', department.finalOutput],
                    [
                      'Starting point',
                      department.productKey ? 'Product exists' : 'No product yet',
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-subtle">{label}</dt>
                      <dd className="text-right text-body">{value}</dd>
                    </div>
                  ))}
                </dl>
              </button>

              <div className="border-t border-line px-5 py-3.5">
                {playable ? (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => startBootcamp(department.slug)}
                      loading={busy === department.slug}
                      className="flex-1"
                    >
                      {session ? 'Resume bootcamp' : 'Start bootcamp'}
                    </Button>
                    {session ? (
                      <Badge tone={session.status === 'completed' ? 'success' : 'brand'} dot>
                        {session.status.replace('_', ' ')}
                      </Badge>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-[11px] text-subtle">
                    Scenario content not authored yet — the engine already supports it
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Link
          href="/office"
          className="text-xs text-muted underline-offset-4 transition-colors hover:text-strong hover:underline"
        >
          Or walk into the 2D office first →
        </Link>
      </div>
    </div>
  );
}
