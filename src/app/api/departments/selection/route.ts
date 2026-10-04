import { z } from 'zod';
import { getRepository } from '@/db/repository';
import { DEPARTMENTS } from '@/content/departments';
import { parseBody, withUser } from '@/lib/api';

const validSlugs = DEPARTMENTS.map((d) => d.slug) as [string, ...string[]];

const schema = z.object({
  departmentSlugs: z
    .array(z.enum(validSlugs))
    .min(1, 'select at least one department')
    .max(3, 'select at most three departments'),
});

export async function POST(request: Request) {
  return withUser(async (user) => {
    const { departmentSlugs } = await parseBody(request, schema);
    const unique = Array.from(new Set(departmentSlugs));
    const selection = await getRepository().saveDepartmentSelection(
      user.id,
      unique,
    );
    return { selection };
  });
}
