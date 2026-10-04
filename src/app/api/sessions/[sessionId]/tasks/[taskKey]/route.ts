import { z } from 'zod';
import { parseBody, withUser } from '@/lib/api';
import { requireOwnedSession } from '@/services/scenario/session-service';
import { saveTaskAnswer } from '@/services/scenario/task-service';

const schema = z.object({
  value: z.unknown(),
  status: z.enum(['draft', 'submitted']),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; taskKey: string }> },
) {
  const { sessionId, taskKey } = await params;
  return withUser(async (user) => {
    const body = await parseBody(request, schema);
    const session = await requireOwnedSession(sessionId, user.id);
    return saveTaskAnswer({
      session,
      taskKey,
      value: body.value,
      status: body.status,
    });
  });
}
