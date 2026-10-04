import type { ReactNode } from 'react';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-ink-700/70 bg-ink-900/70 shadow-xl shadow-black/30 backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-800 px-5 py-4">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold tracking-tight text-white">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

type BadgeTone = 'neutral' | 'brand' | 'success' | 'warn' | 'danger' | 'muted';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-800 text-ink-200 border-ink-700',
  brand: 'bg-brand-500/15 text-brand-400 border-brand-500/30',
  success: 'bg-accent-400/15 text-accent-400 border-accent-400/30',
  warn: 'bg-warn-400/15 text-warn-400 border-warn-400/30',
  danger: 'bg-danger-400/15 text-danger-400 border-danger-400/30',
  muted: 'bg-ink-900 text-ink-400 border-ink-800',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        BADGE_TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-400 disabled:bg-ink-700 disabled:text-ink-400',
  secondary:
    'border border-ink-600 bg-ink-800 text-ink-200 hover:border-ink-400 hover:text-white disabled:opacity-50',
  ghost: 'text-ink-300 hover:bg-ink-800 hover:text-white disabled:opacity-50',
  danger:
    'border border-danger-400/40 bg-danger-400/10 text-danger-400 hover:bg-danger-400/20',
};

export function Button({
  children,
  variant = 'primary',
  className,
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  helpText,
  required,
  children,
  epistemic,
}: {
  label: ReactNode;
  helpText?: string | null;
  required?: boolean;
  children: ReactNode;
  epistemic?: 'fact' | 'hypothesis' | 'neutral';
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-ink-200">
          {label}
          {required ? <span className="ml-1 text-danger-400">*</span> : null}
        </span>
        {epistemic === 'fact' ? (
          <Badge tone="success">Evidence</Badge>
        ) : null}
        {epistemic === 'hypothesis' ? (
          <Badge tone="warn">Hypothesis</Badge>
        ) : null}
      </div>
      {children}
      {helpText ? <p className="mt-1 text-[11px] text-ink-400">{helpText}</p> : null}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-ink-700 bg-ink-950/60 px-3 py-2 text-sm text-ink-100 outline-none transition-colors placeholder:text-ink-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40';

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-700 px-4 py-8 text-center text-sm text-ink-400">
      {children}
    </div>
  );
}
