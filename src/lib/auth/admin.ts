import 'server-only';
import { env } from '@/lib/env';
import type { User } from '@/types/runtime';

/**
 * Admin access.
 *
 * Allow-list by email via `X_PASS_ADMIN_EMAILS`, or a `role = 'admin'` row.
 * When no allow-list is configured and we are not in production, any signed-in
 * user may open the admin pages — a deliberate development convenience that
 * turns off the moment the app is built for production.
 */
const allowList = (process.env.X_PASS_ADMIN_EMAILS ?? '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

export function isAdmin(user: User): boolean {
  if (user.role === 'admin') return true;
  if (allowList.length > 0) return allowList.includes(user.email.toLowerCase());
  return !env.isProduction;
}

export const adminAllowListConfigured = allowList.length > 0;
