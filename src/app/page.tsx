import Link from 'next/link';
import { Logo, RuntimeBadges } from '@/components/app-shell';
import { Badge, Card } from '@/components/ui';
import { DEPARTMENTS } from '@/content/departments';
import { getCurrentUser } from '@/lib/auth/session';
import { runtimeModeSummary } from '@/lib/env';

const FLOW = [
  ['Research', 'Read the real account material before you pitch anything.'],
  ['Interview', 'Ask the buyer questions that can change your proposal.'],
  ['Decide', 'Design a deal that works for both sides — not just a closed one.'],
  ['Revise', 'Something changes. Decide what holds and what moves.'],
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const runtime = runtimeModeSummary();

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <RuntimeBadges
          persistenceLabel={runtime.persistenceLabel}
          aiLabel={runtime.aiLabel}
          aiModeDowngraded={runtime.aiModeDowngraded}
        />
      </header>

      <section className="mt-20 max-w-3xl animate-fade-up">
        <Badge tone="brand" dot>
          2D Virtual Office × Business Simulation × AI Employees
        </Badge>

        <h1 className="mt-6 text-[2.75rem] font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
          Step into the company.
          <br />
          Do the work.
          <br />
          <span className="bg-gradient-to-r from-brand-400 via-brand-300 to-accent-400 bg-clip-text text-transparent">
            Discover your fit.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-300">
          Join <strong className="font-semibold text-white">BITE</strong>, a casual F&amp;B
          company. Walk into its office, take on real business work across five
          departments, talk to the people who actually make the decisions, and revise your
          thinking when new information lands.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={user ? '/departments' : '/login'}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-500"
          >
            {user ? 'Continue to BITE' : 'Enter BITE'}
          </Link>
          <Link
            href="/office"
            className="rounded-xl border border-ink-600 px-5 py-2.5 text-sm font-medium text-ink-200 transition-colors hover:border-ink-400 hover:bg-ink-850 hover:text-white"
          >
            Visit the 2D office
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FLOW.map(([title, body], index) => (
          <Card key={title} className="p-4">
            <span className="font-mono text-[11px] text-ink-600">
              0{index + 1}
            </span>
            <p className="mt-2 text-sm font-semibold text-white">{title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-400">{body}</p>
          </Card>
        ))}
      </section>

      <section className="mt-16">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Same company, different work
          </h2>
          <span className="text-[11px] text-ink-600">
            Choose 3 of 5 · ~3 hours each
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.map((department) => (
            <Card
              key={department.slug}
              accent={department.accentColor}
              interactive
              className="p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: department.accentColor }}
                >
                  {department.name}
                </span>
                {department.status === 'playable' ? (
                  <Badge tone="success" dot>
                    Playable
                  </Badge>
                ) : (
                  <Badge tone="muted">Coming soon</Badge>
                )}
              </div>
              <p className="mt-2.5 text-xs font-medium text-ink-100">
                {department.projectTitle}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
                {department.coreQuestion}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white">
            LIKE and SKILL FIT are different questions
          </h3>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-400">
            Your report shows what you <strong className="text-ink-200">enjoyed</strong>{' '}
            beside what the <strong className="text-ink-200">work itself showed</strong>.
            They are never collapsed into a single &ldquo;career fit&rdquo; number, and
            time spent or questions asked never become points on their own.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-ink-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-ink-950/60">
                  <th className="px-3 py-2 text-left font-medium text-ink-500">Department</th>
                  <th className="px-3 py-2 text-right font-medium text-ink-500">LIKE</th>
                  <th className="px-3 py-2 text-right font-medium text-ink-500">SKILL FIT</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Marketing', '91', '83'],
                  ['Product Management', '78', '89'],
                  ['Strategy', '84', '86'],
                ].map(([name, like, fit]) => (
                  <tr key={name} className="border-t border-ink-800/70">
                    <td className="px-3 py-2 text-ink-300">{name}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-200">{like}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-200">{fit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-ink-600">
            Illustrative. Your own report reports <span className="font-mono">NE</span>{' '}
            where there is not enough evidence yet.
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white">What this is not</h3>
          <ul className="mt-3 space-y-2 text-xs text-ink-400">
            {[
              'An AI aptitude test',
              'A personality diagnosis',
              'A career quiz',
              'A mentor-matching marketplace',
              'A 3D metaverse',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="text-ink-700" aria-hidden>
                  ✕
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-ink-800 pt-4 text-xs leading-relaxed text-ink-300">
            It is a place where you do the job, and what you did becomes the evidence.
          </p>
        </Card>
      </section>
    </div>
  );
}
