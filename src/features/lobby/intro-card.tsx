'use client';

import { useEffect, useRef, type ReactNode, type Ref } from 'react';
import { LOBBY_H, LOBBY_W, paintLobby, type LobbySignage } from './lobby-art';

/** The pixel-art lobby, filling its parent. */
export function LobbyCanvas({ signage }: { signage: LobbySignage }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signageKey = JSON.stringify(signage);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintLobby(ctx, signage);
    // Repaint only when what the signs say changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signageKey]);

  return (
    <canvas
      ref={canvasRef}
      width={LOBBY_W}
      height={LOBBY_H}
      aria-hidden
      className="absolute inset-0 h-full w-full object-cover [image-rendering:pixelated]"
    />
  );
}

/** The product mark over the lobby, top left. */
export function LobbyBrand() {
  return (
    <div className="flex items-center gap-2 text-sm font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
      <span className="grid size-6 place-items-center rounded-md bg-brand-600 text-xs">X</span>
      X-PASS Discover
    </div>
  );
}

/**
 * The intro card that sits over the lobby: a step counter with progress dots,
 * a title with one highlighted word, and one big action.
 */
export function IntroCard({
  index,
  total,
  title,
  subtitle,
  body,
  action,
  onAction,
  onBack,
  onSkip,
  actionRef,
  testIdPrefix,
}: {
  index: number;
  total: number;
  title: ReactNode;
  subtitle: ReactNode;
  body?: ReactNode;
  action: string;
  onAction: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  actionRef?: Ref<HTMLButtonElement>;
  testIdPrefix: string;
}) {
  return (
    <div
      key={index}
      className="w-full max-w-[460px] animate-pop rounded-xl border-[3px] border-[#1d2433] bg-[#fbfaf7] px-6 pb-5 pt-3.5 text-center shadow-[6px_6px_0_rgba(15,23,41,0.35)]"
    >
      <div className="relative flex items-center justify-center text-[11px] font-semibold tracking-wider text-muted">
        <span>
          INTRO&nbsp;&nbsp;{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="absolute right-0 text-[11px] font-medium text-subtle underline-offset-4 hover:text-strong hover:underline"
            data-testid={`${testIdPrefix}-skip`}
          >
            Skip
          </button>
        ) : null}
      </div>

      <div className="mx-auto mt-2 flex w-40 items-center" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="flex flex-1 items-center last:flex-none">
            <span
              className={`size-2.5 shrink-0 rounded-full ${
                i <= index ? 'bg-brand-600' : 'bg-line-strong'
              } ${i === index ? 'ring-4 ring-brand-100' : ''}`}
            />
            {i < total - 1 ? (
              <span className={`h-0.5 flex-1 ${i < index ? 'bg-brand-600' : 'bg-line-strong'}`} />
            ) : null}
          </span>
        ))}
      </div>

      <h2 className="mt-4 text-xl font-bold tracking-tight text-strong sm:text-2xl">{title}</h2>
      <p className="mt-1.5 text-sm font-medium text-body">{subtitle}</p>
      {body ? (
        <div className="mx-auto mt-3 max-w-[380px] text-xs leading-relaxed text-muted">{body}</div>
      ) : null}

      <div className="mt-5 flex items-center justify-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-3 py-2.5 text-xs font-medium text-muted hover:text-strong"
          >
            Back
          </button>
        ) : null}
        <button
          ref={actionRef}
          type="button"
          onClick={onAction}
          className="min-w-[220px] rounded-lg border-2 border-[#1d4ed8] bg-brand-600 px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-[0_3px_0_#1e3a8a] transition-transform hover:bg-brand-700 active:translate-y-[2px] active:shadow-[0_1px_0_#1e3a8a]"
          data-testid={`${testIdPrefix}-next`}
        >
          {action}
        </button>
      </div>
    </div>
  );
}

export const Highlight = ({ children }: { children: ReactNode }) => (
  <span className="text-brand-600">{children}</span>
);
