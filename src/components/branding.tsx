import { Badge } from './ui';

/**
 * Client-safe chrome.
 *
 * These live apart from `AppShell` on purpose: the shell resolves the current
 * user and therefore pulls in `server-only`, while the wordmark and the runtime
 * badges are rendered inside client components too. Keeping them in separate
 * modules is what stops a client bundle from reaching the session code.
 */

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
