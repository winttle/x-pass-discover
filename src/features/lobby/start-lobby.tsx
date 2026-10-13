'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Highlight, IntroCard, LobbyBrand, LobbyCanvas } from './intro-card';

/**
 * The onboarding lobby. The counter reads as the student's first day: this
 * lobby, the pre-survey, choosing departments, then the first bootcamp — and
 * START moves them on to the second of those.
 */
export function StartLobby({ directory, account }: { directory: string[]; account: ReactNode }) {
  const router = useRouter();
  const actionRef = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    actionRef.current?.focus();
    router.prefetch('/pre-survey');
  }, [router]);

  function start() {
    setLeaving(true);
    router.push('/pre-survey');
  }

  return (
    <main
      className="fixed inset-0 overflow-hidden bg-[#1d2433]"
      data-testid="start-lobby"
      aria-label="X-PASS Discover lobby"
    >
      <LobbyCanvas
        signage={{
          directoryTitle: ['Toward Broader', 'Career Possibilities'],
          directory,
        }}
      />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-4 px-5 py-4">
        <LobbyBrand />
        <div className="rounded-lg bg-surface/90 px-2.5 py-1.5 shadow-float">{account}</div>
      </div>

      <div
        className={`absolute inset-x-0 top-[9%] flex justify-center px-4 transition-opacity duration-300 ${
          leaving ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <IntroCard
          index={0}
          total={4}
          title={
            <>
              Your <Highlight>Bootcamp</Highlight> Starts Now.
            </>
          }
          subtitle="Are You Ready?"
          action="Start"
          onAction={start}
          actionRef={actionRef}
          testIdPrefix="start-lobby"
        />
      </div>
    </main>
  );
}
