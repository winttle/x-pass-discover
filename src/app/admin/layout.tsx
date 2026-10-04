import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { adminAllowListConfigured, isAdmin } from '@/lib/auth/admin';
import { AppShell } from '@/components/app-shell';
import { Badge } from '@/components/ui';

const NAV = [
  ['/admin', 'Overview'],
  ['/admin/departments', 'Departments'],
  ['/admin/projects', 'Projects'],
  ['/admin/scenarios', 'Scenarios'],
  ['/admin/resources', 'Resources'],
  ['/admin/ai-personas', 'AI Personas'],
  ['/admin/events', 'Behavior events'],
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isAdmin(user)) redirect('/departments');

  return (
    <AppShell
      title="Admin"
      subtitle="Inspect scenario configuration and runtime behavior"
      backHref="/departments"
      backLabel="Student app"
      right={
        adminAllowListConfigured ? null : (
          <Badge tone="warn" title="X_PASS_ADMIN_EMAILS is not set">
            Dev-open admin
          </Badge>
        )
      }
    >
      <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="space-y-1">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="block rounded-lg px-3 py-2 text-xs text-ink-300 transition-colors hover:bg-ink-850 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </AppShell>
  );
}
