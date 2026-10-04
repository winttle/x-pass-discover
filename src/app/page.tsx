import Link from 'next/link';
import { DEPARTMENTS } from '@/content/departments';
import { getCurrentUser } from '@/lib/auth/session';
import { runtimeModeSummary } from '@/lib/env';
import { RuntimeBadges } from '@/components/app-shell';
import { Badge, Card } from '@/components/ui';

export default async function LandingPage() {
  const user = await getCurrentUser();
  const runtime = runtimeModeSummary();

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-500 text-sm font-bold text-white">
            X
          </span>
          <span className="text-base font-semibold tracking-tight text-white">
            X-PASS <span className="text-ink-400">Discover</span>
          </span>
        </div>
        <RuntimeBadges
          persistenceLabel={runtime.persistenceLabel}
          aiLabel={runtime.aiLabel}
          aiModeDowngraded={runtime.aiModeDowngraded}
        />
      </div>

      <section className="mt-16 max-w-3xl">
        <Badge tone="brand">2D Virtual Office × Business Simulation × AI Employees</Badge>
        <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
          Step into the company.
          <br />
          Do the work.
          <br />
          <span className="text-brand-400">Discover your fit.</span>
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink-300">
          Join <strong className="text-white">BITE</strong>, a casual F&amp;B company.
          Walk into its office, take on real business work across five departments,
          talk to the people who actually make the decisions, and revise your thinking
          when new information lands.
        </p>
        <p className="mt-3 text-sm text-ink-400">
          Your report separates what you <strong className="text-ink-200">liked</strong> from
          what the <strong className="text-ink-200">work itself</strong> showed — two different
          things, never collapsed into one score.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={user ? '/departments' : '/login'}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-400"
          >
            {user ? 'Continue to BITE' : 'Enter BITE'}
          </Link>
          <Link
            href="/office"
            className="rounded-lg border border-ink-600 px-5 py-2.5 text-sm font-medium text-ink-200 transition-colors hover:border-ink-400 hover:text-white"
          >
            Visit the 2D office
          </Link>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          Same company, different work
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.map((department) => (
            <Card key={department.slug} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-sm font-semibold text-white"
                  style={{ color: department.accentColor }}
                >
                  {department.name}
                </span>
                {department.status === 'playable' ? (
                  <Badge tone="success">Playable</Badge>
                ) : (
                  <Badge tone="muted">Coming soon</Badge>
                )}
              </div>
              <p className="mt-2 text-xs font-medium text-ink-200">
                {department.projectTitle}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
                {department.coreQuestion}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
