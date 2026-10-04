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
 * LIKE and SKILL FIT are rendered as two separate columns that are never
 * combined into a single "career fit" number. SKILL FIT reads `NE` (Not Enough
 * Evidence) until the evaluation pipeline exists — an honest absence, not a
 * zero and not a guess.
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
    return {
      department,
      like,
      completed: completedSlugs.has(department.slug),
    };
  });

  const anyCompleted = completedSlugs.size > 0;

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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-ink-700 px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Department
                  </th>
                  <th className="border-b border-ink-700 px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    LIKE
                    <span className="block font-normal normal-case text-ink-600">
                      self-reported
                    </span>
                  </th>
                  <th className="border-b border-ink-700 px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    SKILL FIT
                    <span className="block font-normal normal-case text-ink-600">
                      from work evidence
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ department, like, completed }) => (
                  <tr key={department.slug}>
                    <td className="border-b border-ink-800 px-5 py-3">
                      <span
                        className="text-xs font-medium"
                        style={{ color: department.accentColor }}
                      >
                        {department.name}
                      </span>
                      {completed ? (
                        <Badge tone="success" className="ml-2">
                          Bootcamp done
                        </Badge>
                      ) : null}
                    </td>
                    <td className="border-b border-ink-800 px-5 py-3 text-right font-mono text-ink-200">
                      {like ?? '—'}
                    </td>
                    <td className="border-b border-ink-800 px-5 py-3 text-right">
                      <Badge tone="muted" title="Not Enough Evidence">
                        NE
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ink-800 px-5 py-4">
            <p className="text-[11px] leading-relaxed text-ink-400">
              <strong className="text-ink-200">NE = Not Enough Evidence.</strong> SKILL FIT
              is produced by extracting evidence from your actual work and rating it against
              behaviourally anchored criteria. That pipeline is not implemented in this
              build, so nothing is shown rather than something invented. Behavior counts —
              time spent, questions asked, resources opened — are never converted into a
              score on their own.
            </p>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="How to read this" />
            <div className="space-y-3 px-5 py-4 text-xs leading-relaxed text-ink-300">
              <p>
                This report does not say{' '}
                <span className="text-ink-500 line-through">“You are suited for Strategy.”</span>
              </p>
              <p>
                It says: based on these work experiences, some directions may be worth
                exploring more deeply — and shows you what you said you liked beforehand,
                next to what you actually did.
              </p>
              <p className="text-ink-400">
                Liking a kind of work and being good at it are different questions. Keeping
                them apart is the point.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Your bootcamps" />
            <div className="px-5 py-4">
              {sessions.length === 0 ? (
                <EmptyState>
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
                        className="text-xs text-ink-200 underline-offset-4 hover:text-white hover:underline"
                      >
                        {session.departmentSlug}
                      </Link>
                      <Badge tone={session.status === 'completed' ? 'success' : 'brand'}>
                        {session.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {!anyCompleted ? (
            <p className="text-[11px] leading-relaxed text-ink-500">
              Finish at least one bootcamp for this page to mean anything. The post-survey
              that completes the LIKE side is not built yet.
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
