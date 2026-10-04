import { z } from 'zod';
import { parseBody, withUser } from '@/lib/api';
import { startSession } from '@/services/scenario/session-service';

const schema = z.object({
  departmentSlug: z.string().trim().min(1),
});

export async function POST(request: Request) {
  return withUser(async (user) => {
    const { departmentSlug } = await parseBody(request, schema);
    const session = await startSession(user.id, departmentSlug);
    return { session };
  });
}
