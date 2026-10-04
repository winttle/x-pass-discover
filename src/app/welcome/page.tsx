import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { BITE_COMPANY } from '@/content/company';
import { getCurrentUser } from '@/lib/auth/session';

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <AppShell title="Welcome to BITE" subtitle={`Signed in as ${user.displayName}`}>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <Badge tone="brand">Day one</Badge>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            “I came to work at BITE today.”
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-300">
            {BITE_COMPANY.profile}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
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
              <div key={step} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3.5">
                <span className="grid size-6 place-items-center rounded-md bg-ink-800 text-[11px] font-semibold text-ink-200">
                  {step}
                </span>
                <p className="mt-2.5 text-xs font-semibold text-white">{title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{body}</p>
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
          <ul className="space-y-2.5 px-5 py-4 text-xs text-ink-400">
            {[
              'An AI aptitude test',
              'A personality diagnosis',
              'A career quiz',
              'A mentor-matching marketplace',
              'A 3D metaverse',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-600" />
                {item}
              </li>
            ))}
          </ul>
          <div className="border-t border-ink-800 px-5 py-4">
            <p className="text-xs leading-relaxed text-ink-300">
              It is a place where you do the job, and what you did becomes the evidence.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
