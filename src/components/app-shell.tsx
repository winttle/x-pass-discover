import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from './ui';

export function RuntimeBadges({
  persistenceLabel,
  aiLabel,
  aiModeDowngraded,
}: {
  persistenceLabel: string;
  aiLabel: string;
  aiModeDowngraded?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="muted" title="Where runtime state is being written">
        DB: {persistenceLabel}
      </Badge>
      <Badge
        tone={aiModeDowngraded ? 'warn' : 'muted'}
        title="Which AI adapter is live"
      >
        AI: {aiLabel}
        {aiModeDowngraded ? ' — key missing' : ''}
      </Badge>
    </div>
  );
}

export function AppShell({
  children,
  title,
  subtitle,
  right,
  backHref,
  backLabel,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              X
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">
              X-PASS <span className="text-ink-400">Discover</span>
            </span>
          </Link>
          <div className="h-5 w-px bg-ink-800" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-white">{title}</h1>
            {subtitle ? (
              <p className="truncate text-xs text-ink-400">{subtitle}</p>
            ) : null}
          </div>
          {backHref ? (
            <Link
              href={backHref}
              className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-ink-500 hover:text-white"
            >
              ← {backLabel ?? 'Back'}
            </Link>
          ) : null}
          {right}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
    </div>
  );
}
