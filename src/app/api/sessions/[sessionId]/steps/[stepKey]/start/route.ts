import { withUser } from '@/lib/api';
import {
  markStepStarted,
  requireOwnedSession,
} from '@/services/scenario/session-service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string; stepKey: string }> },
) {
  const { sessionId, stepKey } = await params;
  return withUser(async (user) => {
    const session = await requireOwnedSession(sessionId, user.id);
    await markStepStarted(session, stepKey);
    return { ok: true };
  });
}
