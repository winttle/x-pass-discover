import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { SignOutButton } from './sign-out-button';

/**
 * Who you are signed in as, and the way out.
 *
 * Rendered by `AppShell` and by the landing page, so every screen a signed-in
 * student can reach offers a sign-out — including a shared classroom machine,
 * which is the case that makes this more than a convenience.
 */
export async function AccountMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-body transition-colors hover:border-line-strong hover:bg-sunken hover:text-strong"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2" data-testid="account-menu">
      <span
        className="hidden max-w-[16ch] truncate text-[11px] text-muted sm:inline"
        title={user.email}
      >
        {user.displayName}
      </span>
      <SignOutButton />
    </div>
  );
}
