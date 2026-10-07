import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { HeroBanner } from '@/components/media';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { BITE_COMPANY } from '@/content/company';
import { MEDIA } from '@/content/media';
import { getCurrentUser } from '@/lib/auth/session';

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <AppShell title="Welcome to BITE" subtitle={`Signed in as ${user.displayName}`}>
      <HeroBanner
        src={MEDIA.companyHero.src}
        alt={MEDIA.companyHero.alt}
        height="h-52"
        eyebrow={<Badge tone="brand" dot>Day one</Badge>}
        title="“I came to work at BITE today.”"
        description={BITE_COMPANY.profile}
      />

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <p className="text-sm leading-relaxed text-body">
            You will choose three departments. Each one runs as a bootcamp of roughly
            2.5–3.5 hours, to be finished within 24 hours of starting. You will read real
            business material, talk to colleagues and customers, make decisions, and then
            revise them when something changes — because something always changes.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ['1', 'Pre-survey', 'Tell us what you think you like — before the work.'],
              ['2', 'Choose 3 departments', 'Same company, different work.'],
              ['3', 'Do the work', 'Then compare LIKE against what the work showed.'],
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
              <Button>Start the pre-survey</Button>
            </Link>
            <Link href="/departments">
              <Button variant="secondary">Skip to departments</Button>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="What this is not"
            subtitle="So expectations are set correctly"
          />
          <ul className="space-y-2.5 px-5 py-4 text-xs text-muted">
            {[
              'An AI aptitude test',
              'A personality diagnosis',
              'A career quiz',
              'A mentor-matching marketplace',
              'A 3D metaverse',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
                {item}
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-4">
            <p className="text-xs leading-relaxed text-body">
              It is a place where you do the job, and what you did becomes the evidence.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
