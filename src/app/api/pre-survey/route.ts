import { z } from 'zod';
import { getRepository } from '@/db/repository';
import { parseBody, withUser } from '@/lib/api';
import { logEvent } from '@/services/events';

const schema = z.object({
  answers: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  return withUser(async (user) => {
    const { answers } = await parseBody(request, schema);
    const survey = await getRepository().savePreSurvey(user.id, answers);
    await logEvent({
      userId: user.id,
      sessionId: null,
      eventType: 'task_started',
      metadata: { kind: 'pre_survey' },
    });
    return { survey };
  });
}
