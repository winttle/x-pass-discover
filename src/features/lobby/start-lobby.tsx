'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useT } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages/en';
import { Highlight, IntroCard, LobbyBrand, LobbyCanvas } from './intro-card';

/**
 * The onboarding lobby. The counter reads as the student's first day: this
 * lobby, the pre-survey, choosing departments, then the first bootcamp — and
 * START moves them on to the second of those.
 */
export function StartLobby({ departments, account }: { departments: string[]; account: ReactNode }) {
  const router = useRouter();
  const t = useT();
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
      aria-label={t('lobby.aria')}
    >
      <LobbyCanvas
        signage={{
          directoryTitle: [t('lobby.directory.line1'), t('lobby.directory.line2')],
          panel: [t('lobby.panel.line1'), t('lobby.panel.line2')],
          directory: departments.map((slug) => t(`dept.${slug}` as MessageKey)),
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
              {t('lobby.title.before')}
              <Highlight>{t('lobby.title.highlight')}</Highlight>
              {t('lobby.title.after')}
            </>
          }
          subtitle={t('lobby.subtitle')}
          action={t('lobby.start')}
          onAction={start}
          actionRef={actionRef}
          testIdPrefix="start-lobby"
        />
      </div>
    </main>
  );
}
