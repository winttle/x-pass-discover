import Image from 'next/image';
import type { ReactNode } from 'react';
import { cn } from './ui';

/**
 * Imagery primitives.
 *
 * Artwork is first-party SVG (see `src/content/media.ts`), so these render
 * through `next/image` with `unoptimized` — there is nothing to re-encode, and
 * it keeps the swap to real photography a one-line change per image.
 */

export function Cover({
  src,
  alt,
  className,
  overlay,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  overlay?: ReactNode;
  priority?: boolean;
}) {
  return (
    <div className={cn('relative overflow-hidden bg-sunken', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        priority={priority}
        sizes="(max-width: 768px) 100vw, 480px"
        className="object-cover"
      />
      {overlay}
    </div>
  );
}

export function Portrait({
  src,
  alt,
  size = 40,
  ring,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  /** Accent colour for the ring around the portrait. */
  ring?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden rounded-full bg-sunken ring-2 ring-surface',
        className,
      )}
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 2px ${ring}33` : undefined,
      }}
    >
      <Image src={src} alt={alt} fill unoptimized sizes={`${size}px`} className="object-cover" />
    </span>
  );
}

const FORMAT_STYLES: Record<string, { bg: string; text: string }> = {
  PDF: { bg: 'bg-danger-50', text: 'text-danger-700' },
  XLSX: { bg: 'bg-accent-50', text: 'text-accent-700' },
  DOC: { bg: 'bg-brand-50', text: 'text-brand-700' },
  WEB: { bg: 'bg-warn-50', text: 'text-warn-700' },
};

/** A file-type chip, so a resource reads like a document rather than a link. */
export function FileIcon({ format }: { format: string }) {
  const style = FORMAT_STYLES[format] ?? FORMAT_STYLES.DOC;
  return (
    <span
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-lg text-[9px] font-bold tracking-tight',
        style.bg,
        style.text,
      )}
      aria-hidden
    >
      {format}
    </span>
  );
}

/** Wide banner used at the top of a page or a workspace step. */
export function HeroBanner({
  src,
  alt,
  eyebrow,
  title,
  description,
  actions,
  accent,
  height = 'h-44',
  objectPosition = '72% 55%',
}: {
  src: string;
  alt: string;
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  accent?: string;
  height?: string;
  /** Which part of the artwork to keep in frame behind the copy. */
  objectPosition?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className={cn('relative', height)}>
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition }}
        />
        {/* Keeps the copy readable while leaving the right side of the art visible. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.94) 34%, rgba(255,255,255,0.55) 56%, rgba(255,255,255,0) 82%)',
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-center gap-2 px-6 sm:px-8">
          {eyebrow}
          <h2
            className="max-w-xl text-xl font-bold tracking-tight text-strong sm:text-2xl"
            style={accent ? { color: accent } : undefined}
          >
            {title}
          </h2>
          {description ? (
            <p className="max-w-lg text-xs leading-relaxed text-body sm:text-sm">
              {description}
            </p>
          ) : null}
          {actions ? <div className="mt-1 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
