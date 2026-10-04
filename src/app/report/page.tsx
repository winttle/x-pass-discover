import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { Badge, Card, CardHeader, EmptyState } from '@/components/ui';
import { getRepository } from '@/db/repository';
import { DEPARTMENTS } from '@/content/departments';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * Career report.
 *
 * LIKE and SKILL FIT are two separate columns that are never combined into a
 * single "career fit" number. LIKE is one measure across departments, so it is
 * drawn as a single-hue bar — identity is carried by the row label, not by the
 * colour, and every bar is directly labelled so the value never depends on
 * reading the colour. SKILL FIT reads `NE` (Not Enough Evidence) until the
 * evaluation pipeline exists.
 */
export default async function ReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const repo = getRepository();
  const [preSurvey, sessions] = await Promise.all([
    repo.getPreSurvey(user.id),
    repo.listSessionsForUser(user.id),
  ]);

  const completedSlugs = new Set(
    sessions.filter((s) => s.status === 'completed').map((s) => s.departmentSlug),
  );

  const rows = DEPARTMENTS.map((department) => {
    const raw = preSurvey?.answers?.[`interest_${department.slug}`];
    const like = typeof raw === 'number' ? Math.round((raw / 5) * 100) : null;
    return { department, like, completed: completedSlugs.has(department.slug) };
  });

  const hasLike = rows.some((row) => row.like !== null);

  return (
    <AppShell
      title="Career report"
      subtitle="What you liked, and what the work showed — kept separate"
      backHref="/departments"
      backLabel="Departments"
    >
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title="LIKE vs SKILL FIT"
            subtitle="Two different measurements. They are never merged into one score."
          />

          <div className="px-5 py-4">
            <div className="grid grid-cols-[minmax(110px,1fr)_minmax(140px,2fr)_84px] gap-x-4 pb-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">
              <span>Department</span>
              <span>
                LIKE
                <span className="ml-1.5 font-normal normal-case text-subtle">
                  self-reported, before the work
                </span>
              </span>
              <span className="text-right">
                SKILL FIT
                <span className="block font-normal normal-case text-subtle">
                  from work evidence
                </span>
              </span>
            </div>

            <div className="divide-y divide-line">
              {rows.map(({ department, like, completed }) => (
                <div
                  key={department.slug}
                  className="grid grid-cols-[minmax(110px,1fr)_minmax(140px,2fr)_84px] items-center gap-x-4 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: department.accentColor }}
                    />
                    <span className="truncate text-xs text-strong">
                      {department.name}
                    </span>
                    {completed ? (
                      <Badge tone="success" className="shrink-0">
                        done
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-2.5 flex-1 overflow-hidden rounded-full bg-sunken"
                      role="img"
                      aria-label={
                        like === null
                          ? `${department.name} LIKE not recorded`
                          : `${department.name} LIKE ${like} out of 100`
                      }
                    >
                      {like !== null ? (
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.max(like, 2)}%` }}
                        />
                      ) : null}
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-xs text-strong">
                      {like ?? '—'}
                    </span>
                  </div>

                  <div className="text-right">
                    <Badge tone="muted" title="Not Enough Evidence">
                      NE
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {!hasLike ? (
              <p className="mt-3 rounded-lg border border-line bg-sunken px-3 py-2 text-[11px] text-muted">
                No LIKE values yet — complete the{' '}
                <Link href="/pre-survey" className="text-brand-400 hover:underline">
                  pre-survey
                </Link>{' '}
                to fill this column.
              </p>
            ) : null}
          </div>

          <div className="border-t border-line px-5 py-4">
            <p className="text-[11px] leading-relaxed text-muted">
              <strong className="text-strong">NE = Not Enough Evidence.</strong> SKILL FIT
              is produced by extracting evidence from your actual work and rating it
              against behaviourally anchored criteria. That pipeline is not implemented in
              this build, so nothing is shown rather than something invented. Behaviour
              counts — time spent, questions asked, resources opened — are never converted
              into a score on their own.
            </p>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="How to read this" />
            <div className="space-y-3 px-5 py-4 text-xs leading-relaxed text-body">
              <p className="rounded-lg border border-line bg-sunken px-3 py-2 text-muted line-through">
                You are suited for Strategy.
              </p>
              <p>
                This report does not say that. It says: based on these work experiences,
                some directions may be worth exploring more deeply — and shows you what you
                said you liked beforehand, next to what you actually did.
              </p>
              <p className="text-muted">
                Liking a kind of work and being good at it are different questions. Keeping
                them apart is the point.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Your bootcamps" />
            <div className="px-5 py-4">
              {sessions.length === 0 ? (
                <EmptyState icon="🧭">
                  No bootcamps yet.{' '}
                  <Link href="/departments" className="text-brand-400 hover:underline">
                    Choose a department
                  </Link>
                  .
                </EmptyState>
              ) : (
                <ul className="space-y-2">
                  {sessions.map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-3">
                      <Link
                        href={`/workspace/${session.id}`}
                        className="text-xs text-strong underline-offset-4 transition-colors hover:text-strong hover:underline"
                      >
                        {DEPARTMENTS.find((d) => d.slug === session.departmentSlug)?.name ??
                          session.departmentSlug}
                      </Link>
                      <Badge
                        tone={session.status === 'completed' ? 'success' : 'brand'}
                        dot
                      >
                        {session.status.replace('_', ' ')}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <p className="px-1 text-[11px] leading-relaxed text-subtle">
            The post-survey that completes the LIKE side is not built yet, and the
            evaluator that fills SKILL FIT is the next milestone.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
