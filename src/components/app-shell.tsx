import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from './ui';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'size-7 text-xs' : 'size-8 text-sm';
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`grid ${box} place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 font-bold text-white shadow-sm shadow-brand-600/30`}
      >
        X
      </span>
      <span className="text-sm font-semibold tracking-tight text-strong">
        X-PASS <span className="font-normal text-muted">Discover</span>
      </span>
    </span>
  );
}

export function RuntimeBadges({
  persistenceLabel,
  persistenceIsEphemeral,
  aiLabel,
  aiModeDowngraded,
}: {
  persistenceLabel: string;
  persistenceIsEphemeral?: boolean;
  aiLabel: string;
  aiModeDowngraded?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        tone={persistenceIsEphemeral ? 'warn' : 'muted'}
        dot
        title={
          persistenceIsEphemeral
            ? 'No DATABASE_URL: work is held in memory and lost on restart'
            : 'Where runtime state is being written'
        }
      >
        {persistenceLabel}
      </Badge>
      <Badge
        tone={aiModeDowngraded ? 'warn' : 'muted'}
        dot
        title="Which AI adapter is live"
      >
        {aiLabel}
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
  wide,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  backHref?: string;
  backLabel?: string;
  wide?: boolean;
}) {
  const container = wide ? 'max-w-[1680px]' : 'max-w-7xl';
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className={`mx-auto flex ${container} flex-wrap items-center gap-4 px-5 py-2.5`}>
          <Link href="/" className="shrink-0">
            <Logo size="sm" />
          </Link>
          <span className="h-5 w-px bg-sunken" aria-hidden />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold tracking-tight text-strong">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-[11px] text-muted">{subtitle}</p>
            ) : null}
          </div>
          {right}
          {backHref ? (
            <Link
              href={backHref}
              className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-body transition-colors hover:border-line-strong hover:bg-sunken hover:text-strong"
            >
              ← {backLabel ?? 'Back'}
            </Link>
          ) : null}
        </div>
      </header>
      <main className={`mx-auto ${container} animate-fade-up px-5 py-6`}>{children}</main>
    </div>
  );
}
