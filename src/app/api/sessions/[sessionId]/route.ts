import { withUser } from '@/lib/api';
import { loadSessionView } from '@/services/scenario/session-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  return withUser(async (user) => ({ view: await loadSessionView(sessionId, user.id) }));
}
