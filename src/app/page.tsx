import Link from 'next/link';
import Image from 'next/image';
import { Logo, RuntimeBadges } from '@/components/app-shell';
import { Cover } from '@/components/media';
import { Badge, Card } from '@/components/ui';
import { MEDIA } from '@/content/media';
import { DEPARTMENTS } from '@/content/departments';
import { getCurrentUser } from '@/lib/auth/session';
import { runtimeModeSummary } from '@/lib/env';

const FLOW = [
  ['Research', 'Read the real account material before you pitch anything.'],
  ['Interview', 'Ask the buyer questions that can change your proposal.'],
  ['Decide', 'Design a deal that works for both sides — not just a closed one.'],
  ['Revise', 'Something changes. Decide what holds and what moves.'],
];

/**
 * The revision band. Each claim here describes behaviour that exists: saves are
 * versioned in `task_answer_revisions` alongside the value they replaced, and
 * behaviour logs are evidence rather than points.
 */
const REVISION_POINTS = [
  ['Versioned', 'Every save keeps the value it replaced.'],
  ['Not a correction', 'Revising on new evidence is the work, not a mistake.'],
  ['Evidence, not points', 'What you changed is recorded. It never becomes a score on its own.'],
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
          persistenceIsEphemeral={runtime.persistenceIsEphemeral}
          aiLabel={runtime.aiLabel}
          aiModeDowngraded={runtime.aiModeDowngraded}
        />
      </header>

      <section className="mt-16 grid animate-fade-up items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
        <Badge tone="brand" dot>
          2D Virtual Office × Business Simulation × AI Employees
        </Badge>

        <h1 className="mt-6 text-[2.75rem] font-bold leading-[1.08] tracking-tight text-strong sm:text-6xl">
          Step into the company.
          <br />
          Do the work.
          <br />
          <span className="bg-gradient-to-r from-brand-400 via-brand-300 to-accent-400 bg-clip-text text-transparent">
            Discover your fit.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-body">
          Join <strong className="font-semibold text-strong">BITE</strong>, a casual F&amp;B
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
            className="rounded-xl border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-body shadow-card transition-colors hover:border-subtle hover:bg-sunken hover:text-strong"
          >
            Visit the 2D office
          </Link>
          </div>
        </div>

        {/* The company is a place before it is a product, so the front door leads. */}
        <Cover
          src={MEDIA.companyExterior.src}
          alt={MEDIA.companyExterior.alt}
          priority
          className="h-64 rounded-2xl border border-line shadow-raised sm:h-80"
          overlay={
            <span className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-medium text-body shadow-card">
              BITE headquarters
            </span>
          }
        />
      </section>

      <section className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FLOW.map(([title, body], index) => (
          <Card key={title} className="p-4">
            <span className="font-mono text-[11px] text-subtle">
              0{index + 1}
            </span>
            <p className="mt-2 text-sm font-semibold text-strong">{title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{body}</p>
          </Card>
        ))}
      </section>

      <section className="mt-16">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Same company, different work
          </h2>
          <span className="text-[11px] text-subtle">
            Choose 3 of 5 · ~3 hours each
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.map((department) => (
            <Card key={department.slug} interactive className="overflow-hidden">
              <div className="relative h-24 border-b border-line">
                <Image
                  src={department.coverImage}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className="object-cover"
                />
              </div>
              <div className="p-4">
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
              <p className="mt-2.5 text-xs font-medium text-strong">
                {department.projectTitle}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                {department.coreQuestion}
              </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/*
        One dark band in an otherwise light page, and it earns it: revising a
        decision is the part of the work most products leave out, and a dusk
        photograph is the one frame here that can carry white type.
      */}
      <section className="relative mt-16 overflow-hidden rounded-3xl border border-line shadow-raised">
        <Image
          src={MEDIA.decisionDesk.src}
          alt={MEDIA.decisionDesk.alt}
          fill
          sizes="(max-width: 1024px) 100vw, 1152px"
          className="object-cover"
          style={{ objectPosition: '50% 42%' }}
        />
        {/*
          A flat base plus a horizontal wash, for the same reason HeroBanner
          layers its overlay: a single gradient that reaches full transparency
          leaves a visible band where it ends.
        */}
        <div className="absolute inset-0 bg-[#0b1220]/35" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(94deg, rgba(11,18,32,0.94) 0%, rgba(11,18,32,0.90) 42%, rgba(11,18,32,0.74) 64%, rgba(11,18,32,0.42) 86%, rgba(11,18,32,0.32) 100%)',
          }}
        />

        <div className="relative px-7 py-12 sm:px-10 sm:py-14">
          <Badge tone="brand" dot className="bg-white/95">
            Decision revision
          </Badge>
          <h2 className="mt-5 max-w-xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            Something changes. Decide what holds and what moves.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75">
            Late in the project, new information lands — and the proposal you already
            defended may not be the right one any more. Reworking it is part of the job,
            so the product treats it that way.
          </p>

          <dl className="mt-8 grid max-w-2xl gap-x-7 gap-y-5 sm:grid-cols-3">
            {REVISION_POINTS.map(([term, detail]) => (
              <div key={term} className="border-t border-white/20 pt-3">
                <dt className="text-xs font-semibold text-white">{term}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-white/70">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mt-16 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-strong">
            LIKE and SKILL FIT are different questions
          </h3>
          <p className="mt-2.5 text-xs leading-relaxed text-muted">
            Your report shows what you <strong className="text-strong">enjoyed</strong>{' '}
            beside what the <strong className="text-strong">work itself showed</strong>.
            They are never collapsed into a single &ldquo;career fit&rdquo; number, and
            time spent or questions asked never become points on their own.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-sunken">
                  <th className="px-3 py-2 text-left font-medium text-muted">Department</th>
                  <th className="px-3 py-2 text-right font-medium text-muted">LIKE</th>
                  <th className="px-3 py-2 text-right font-medium text-muted">SKILL FIT</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Marketing', '91', '83'],
                  ['Product Management', '78', '89'],
                  ['Strategy', '84', '86'],
                ].map(([name, like, fit]) => (
                  <tr key={name} className="border-t border-line">
                    <td className="px-3 py-2 text-body">{name}</td>
                    <td className="px-3 py-2 text-right font-mono text-strong">{like}</td>
                    <td className="px-3 py-2 text-right font-mono text-strong">{fit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-subtle">
            Illustrative. Your own report reports <span className="font-mono">NE</span>{' '}
            where there is not enough evidence yet.
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-strong">What this is not</h3>
          <ul className="mt-3 space-y-2 text-xs text-muted">
            {[
              'An AI aptitude test',
              'A personality diagnosis',
              'A career quiz',
              'A mentor-matching marketplace',
              'A 3D metaverse',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="text-body" aria-hidden>
                  ✕
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-body">
            It is a place where you do the job, and what you did becomes the evidence.
          </p>
        </Card>
      </section>
    </div>
  );
}
