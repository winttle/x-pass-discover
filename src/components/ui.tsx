import type { ReactNode } from 'react';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Card({
  children,
  className,
  accent,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  /** Hex colour for a thin top accent bar. */
  accent?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900/60 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_18px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-sm',
        interactive &&
          'transition-colors duration-200 hover:border-ink-600 hover:bg-ink-900/80',
        className,
      )}
    >
      {accent ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
      ) : null}
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
    <div className="flex items-start justify-between gap-4 border-b border-ink-800/80 px-5 py-3.5">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold tracking-tight text-white">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

type BadgeTone = 'neutral' | 'brand' | 'success' | 'warn' | 'danger' | 'muted';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'border-ink-700 bg-ink-800 text-ink-200',
  brand: 'border-brand-500/35 bg-brand-500/12 text-brand-300',
  success: 'border-accent-400/35 bg-accent-400/12 text-accent-400',
  warn: 'border-warn-400/35 bg-warn-400/12 text-warn-400',
  danger: 'border-danger-400/35 bg-danger-400/12 text-danger-400',
  muted: 'border-ink-800 bg-ink-900/80 text-ink-400',
};

const DOT_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-300',
  brand: 'bg-brand-400',
  success: 'bg-accent-400',
  warn: 'bg-warn-400',
  danger: 'bg-danger-400',
  muted: 'bg-ink-500',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  dot,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5',
        BADGE_TONES[tone],
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span className={cn('size-1.5 shrink-0 rounded-full', DOT_TONES[tone])} />
      ) : null}
      {children}
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 active:bg-brand-600 disabled:bg-ink-700 disabled:text-ink-500 disabled:shadow-none',
  secondary:
    'border border-ink-600 bg-ink-800/80 text-ink-200 hover:border-ink-500 hover:bg-ink-800 hover:text-white disabled:opacity-45',
  ghost:
    'text-ink-300 hover:bg-ink-800/80 hover:text-white disabled:opacity-45',
  danger:
    'border border-danger-400/40 bg-danger-400/10 text-danger-400 hover:bg-danger-400/20',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-[11px] rounded-lg',
  md: 'px-3.5 py-2 text-sm rounded-xl',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  className,
  type = 'button',
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 font-medium transition-all duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:active:scale-100',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70',
        className,
      )}
    />
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
          {required ? <span className="ml-0.5 text-danger-400">*</span> : null}
        </span>
        {epistemic === 'fact' ? (
          <Badge tone="success" dot>
            Evidence
          </Badge>
        ) : null}
        {epistemic === 'hypothesis' ? (
          <Badge tone="warn" dot>
            Hypothesis
          </Badge>
        ) : null}
      </div>
      {children}
      {helpText ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">{helpText}</p>
      ) : null}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-ink-700 bg-ink-950/70 px-3 py-2 text-sm text-ink-100 outline-none transition-all duration-150 placeholder:text-ink-600 hover:border-ink-600 focus:border-brand-500 focus:bg-ink-950 focus:ring-4 focus:ring-brand-500/12';

export function EmptyState({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink-700/80 px-4 py-8 text-center">
      {icon ? (
        <div className="mx-auto mb-3 grid size-9 place-items-center rounded-full bg-ink-850 text-ink-500">
          {icon}
        </div>
      ) : null}
      <div className="text-xs leading-relaxed text-ink-400">{children}</div>
    </div>
  );
}

/** A labelled statistic, used in headers and summary rails. */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-white">{value}</dd>
      {hint ? <p className="text-[10px] text-ink-500">{hint}</p> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-ink-800/70', className)}
      aria-hidden
    />
  );
}
