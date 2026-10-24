import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { HeroBanner } from '@/components/media';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { BITE_COMPANY } from '@/content/company';
import { MEDIA } from '@/content/media';
import { getT } from '@/i18n/server';
import { getCurrentUser } from '@/lib/auth/session';

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const t = await getT();

  return (
    <AppShell title={t('welcome.title')} subtitle={t('welcome.signedInAs', { name: user.displayName })}>
      <HeroBanner
        src={MEDIA.companyOffice.src}
        alt={MEDIA.companyOffice.alt}
        height="h-52"
        eyebrow={<Badge tone="brand" dot>{t('welcome.badge')}</Badge>}
        title={t('welcome.heroTitle')}
        description={BITE_COMPANY.profile}
      />

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <p className="text-sm leading-relaxed text-body">
            {t('welcome.body')}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ['1', t('welcome.step1.title'), t('welcome.step1.body')],
              ['2', t('welcome.step2.title'), t('welcome.step2.body')],
              ['3', t('welcome.step3.title'), t('welcome.step3.body')],
            ].map(([step, title, body]) => (
              <div key={step} className="rounded-xl border border-line bg-sunken p-3.5">
                <span className="grid size-6 place-items-center rounded-md bg-sunken text-[11px] font-semibold text-strong">
                  {step}
                </span>
                <p className="mt-2.5 text-xs font-semibold text-strong">{title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pre-survey">
              <Button>{t('welcome.startSurvey')}</Button>
            </Link>
            <Link href="/departments">
              <Button variant="secondary">{t('welcome.skipToDepartments')}</Button>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t('welcome.notTitle')}
            subtitle={t('welcome.notSubtitle')}
          />
          <ul className="space-y-2.5 px-5 py-4 text-xs text-muted">
            {[
              t('welcome.not1'),
              t('welcome.not2'),
              t('welcome.not3'),
              t('welcome.not4'),
              t('welcome.not5'),
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
                {item}
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-4">
            <p className="text-xs leading-relaxed text-body">
              {t('welcome.isTitle')}
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
