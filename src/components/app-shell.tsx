import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccountMenu } from '@/features/auth/account-menu';
import { Logo } from './branding';

/**
 * The signed-in chrome. It resolves the current user itself (for the account
 * menu) rather than taking one as a prop, so no page can forget to offer a way
 * out. That makes this module server-only — the wordmark and runtime badges
 * live in `branding.tsx` because client components render those too.
 */
export async function AppShell({
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
          <AccountMenu />
        </div>
      </header>
      <main className={`mx-auto ${container} animate-fade-up px-5 py-6`}>{children}</main>
    </div>
  );
}
