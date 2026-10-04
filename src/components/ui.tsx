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
        'relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card',
        // Never translate a card on hover: it shifts the buttons inside it out
        // from under the pointer. Depth change only.
        interactive &&
          'transition-shadow duration-200 hover:border-line-strong hover:shadow-raised',
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
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold tracking-tight text-strong">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

type BadgeTone = 'neutral' | 'brand' | 'success' | 'warn' | 'danger' | 'muted';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'border-line-strong bg-sunken text-body',
  brand: 'border-brand-200 bg-brand-50 text-brand-700',
  success: 'border-accent-100 bg-accent-50 text-accent-700',
  warn: 'border-warn-100 bg-warn-50 text-warn-700',
  danger: 'border-danger-100 bg-danger-50 text-danger-700',
  muted: 'border-line bg-sunken text-muted',
};

const DOT_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  brand: 'bg-brand-500',
  success: 'bg-accent-500',
  warn: 'bg-warn-500',
  danger: 'bg-danger-500',
  muted: 'bg-subtle',
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
    'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700 active:bg-brand-700 disabled:bg-line-strong disabled:text-subtle disabled:shadow-none',
  secondary:
    'border border-line-strong bg-surface text-body shadow-card hover:border-subtle hover:bg-sunken hover:text-strong disabled:opacity-45',
  ghost: 'text-muted hover:bg-sunken hover:text-strong disabled:opacity-45',
  danger:
    'border border-danger-100 bg-danger-50 text-danger-700 hover:bg-danger-100',
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
        <span className="text-xs font-medium text-strong">
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
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{helpText}</p>
      ) : null}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-line bg-sunken px-3 py-2 text-sm text-strong outline-none transition-all duration-150 placeholder:text-subtle hover:border-line-strong focus:border-brand-500 focus:bg-canvas focus:ring-4 focus:ring-brand-500/12';

export function EmptyState({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
      {icon ? (
        <div className="mx-auto mb-3 grid size-9 place-items-center rounded-full bg-sunken text-subtle">
          {icon}
        </div>
      ) : null}
      <div className="text-xs leading-relaxed text-muted">{children}</div>
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
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-strong">{value}</dd>
      {hint ? <p className="text-[10px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-line', className)}
      aria-hidden
    />
  );
}
