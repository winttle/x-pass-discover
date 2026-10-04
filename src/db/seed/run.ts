/**
 * Seeds scenario content into Neon.
 *
 * The runtime reads content from the TypeScript registry (so the app works with
 * no database at all), and this script mirrors the same definitions into the
 * relational tables, which is what gives scenario versions real database
 * identity: a `project_sessions` row points at a `scenario_versions` row, so
 * publishing a new version cannot mutate a session already in flight.
 *
 * Idempotent — safe to re-run.
 */
import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '../client';
import { BITE_COMPANY, BITE_PRODUCTS } from '@/content/company';
import { DEPARTMENTS } from '@/content/departments';
import { listResources, listScenarios } from '@/content/registry';
import { listPersonas } from '@/content/personas.server';

export async function seed(db: NonNullable<ReturnType<typeof getDb>>) {
  console.log('→ company');
  const [company] = await db
    .insert(schema.companies)
    .values({
      slug: BITE_COMPANY.slug,
      name: BITE_COMPANY.name,
      industry: BITE_COMPANY.industry,
      profile: BITE_COMPANY.profile,
    })
    .onConflictDoUpdate({
      target: schema.companies.slug,
      set: { name: BITE_COMPANY.name, profile: BITE_COMPANY.profile },
    })
    .returning();

  console.log('→ products');
  const productIdBySlug: Record<string, string> = {};
  for (const product of BITE_PRODUCTS) {
    const [row] = await db
      .insert(schema.products)
      .values({
        companyId: company.id,
        slug: product.slug,
        name: product.name,
        summary: product.summary,
        attributes: product.attributes as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: schema.products.slug,
        set: {
          name: product.name,
          summary: product.summary,
          attributes: product.attributes as Record<string, unknown>,
        },
      })
      .returning();
    productIdBySlug[product.slug] = row.id;
  }

  console.log('→ departments + projects');
  const departmentIdBySlug: Record<string, string> = {};
  const projectIdByKey: Record<string, string> = {};

  for (const [index, department] of DEPARTMENTS.entries()) {
    const [row] = await db
      .insert(schema.departments)
      .values({
        companyId: company.id,
        slug: department.slug,
        name: department.name,
        tagline: department.tagline,
        description: department.description,
        officeZoneKey: department.officeZoneKey,
        accentColor: department.accentColor,
        status: department.status,
        sortOrder: index,
      })
      .onConflictDoUpdate({
        target: schema.departments.slug,
        set: {
          name: department.name,
          tagline: department.tagline,
          description: department.description,
          officeZoneKey: department.officeZoneKey,
          accentColor: department.accentColor,
          status: department.status,
          sortOrder: index,
        },
      })
      .returning();
    departmentIdBySlug[department.slug] = row.id;

    // product_id stays NULL for PM and Strategy — that is the schema rule, and
    // the only reason it should ever be NULL.
    const productId = department.productKey
      ? (productIdBySlug[department.productKey] ?? null)
      : null;
    if (department.productKey && !productId) {
      throw new Error(
        `Department "${department.slug}" references product "${department.productKey}", which is not in BITE_PRODUCTS. ` +
          'Add it rather than letting product_id fall back to NULL — NULL means "this department has no product".',
      );
    }

    const [project] = await db
      .insert(schema.projects)
      .values({
        departmentId: row.id,
        productId,
        key: department.projectKey,
        title: department.projectTitle,
        coreQuestion: department.coreQuestion,
        finalOutput: department.finalOutput,
      })
      .onConflictDoUpdate({
        target: schema.projects.key,
        set: {
          departmentId: row.id,
          productId,
          title: department.projectTitle,
          coreQuestion: department.coreQuestion,
          finalOutput: department.finalOutput,
        },
      })
      .returning();
    projectIdByKey[department.projectKey] = project.id;
  }

  console.log('→ scenarios');
  for (const scenario of listScenarios()) {
    const department = DEPARTMENTS.find((d) => d.scenarioKey === scenario.scenarioKey);
    if (!department) {
      console.warn(`   ! no department references ${scenario.scenarioKey}, skipping`);
      continue;
    }

    const [scenarioRow] = await db
      .insert(schema.scenarios)
      .values({
        projectId: projectIdByKey[department.projectKey],
        key: scenario.scenarioKey,
        title: scenario.title,
        currentVersion: scenario.version,
      })
      .onConflictDoUpdate({
        target: schema.scenarios.key,
        set: { title: scenario.title, currentVersion: scenario.version },
      })
      .returning();

    const [versionRow] = await db
      .insert(schema.scenarioVersions)
      .values({
        scenarioId: scenarioRow.id,
        version: scenario.version,
        status: scenario.status,
        title: scenario.title,
        studentRole: scenario.studentRole,
        mission: scenario.mission,
        finalOutputTitle: scenario.finalOutputTitle,
        deadlineHours: scenario.deadlineHours,
        publishedAt: scenario.status === 'published' ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [schema.scenarioVersions.scenarioId, schema.scenarioVersions.version],
        set: {
          status: scenario.status,
          title: scenario.title,
          studentRole: scenario.studentRole,
          mission: scenario.mission,
          finalOutputTitle: scenario.finalOutputTitle,
          deadlineHours: scenario.deadlineHours,
        },
      })
      .returning();

    // Steps and tasks are replaced wholesale so a removed step cannot linger.
    await db
      .delete(schema.scenarioSteps)
      .where(eq(schema.scenarioSteps.scenarioVersionId, versionRow.id));

    for (const step of scenario.steps) {
      const [stepRow] = await db
        .insert(schema.scenarioSteps)
        .values({
          scenarioVersionId: versionRow.id,
          key: step.key,
          title: step.title,
          stepType: step.stepType,
          summary: step.summary ?? '',
          instructions: step.instructions ?? '',
          estimatedMinutes: step.estimatedMinutes ?? null,
          sortOrder: step.sortOrder,
          officeZoneKey: step.officeZoneKey ?? null,
          unlockRule: step.unlockRule,
          completionRule: step.completionRule,
          eventPayload: step.eventPayload ?? null,
        })
        .returning();

      for (const [taskIndex, task] of step.tasks.entries()) {
        await db.insert(schema.tasks).values({
          stepId: stepRow.id,
          key: task.key,
          title: task.title,
          instructions: task.instructions ?? '',
          kind: task.kind,
          required: task.required !== false,
          personaKey: task.personaKey ?? null,
          prefillFromTaskKey: task.prefillFromTaskKey ?? null,
          sortOrder: taskIndex,
          fields: task.fields ?? [],
          referenceTaskKeys: task.referenceTaskKeys ?? [],
          guardrailKeys: task.guardrailKeys ?? [],
          completionRule: task.completion,
        });
      }
    }

    console.log(`   scenario ${scenario.scenarioKey} v${scenario.version}: ${scenario.steps.length} steps`);

    console.log('→ resources');
    for (const resource of listResources(scenario.scenarioKey)) {
      await db
        .insert(schema.resources)
        .values({
          scenarioVersionId: versionRow.id,
          departmentId: departmentIdBySlug[department.slug],
          key: resource.key,
          title: resource.title,
          description: resource.description,
          resourceType: resource.resourceType,
          body: resource.body as unknown as Record<string, unknown>,
          visibility: resource.visibility,
          sortOrder: resource.sortOrder,
        })
        .onConflictDoUpdate({
          target: schema.resources.key,
          set: {
            scenarioVersionId: versionRow.id,
            title: resource.title,
            description: resource.description,
            resourceType: resource.resourceType,
            body: resource.body as unknown as Record<string, unknown>,
            visibility: resource.visibility,
            sortOrder: resource.sortOrder,
          },
        });
    }

    // step_resources: link each step to the resources it surfaces.
    const resourceRows = await db
      .select({ id: schema.resources.id, key: schema.resources.key })
      .from(schema.resources)
      .where(eq(schema.resources.scenarioVersionId, versionRow.id));
    const resourceIdByKey = Object.fromEntries(
      resourceRows.map((r) => [r.key, r.id] as const),
    );

    for (const step of scenario.steps) {
      const [stepRow] = await db
        .select({ id: schema.scenarioSteps.id })
        .from(schema.scenarioSteps)
        .where(
          and(
            eq(schema.scenarioSteps.scenarioVersionId, versionRow.id),
            eq(schema.scenarioSteps.key, step.key),
          ),
        )
        .limit(1);
      if (!stepRow) continue;

      for (const [index, resourceKey] of (step.resourceKeys ?? []).entries()) {
        const resourceId = resourceIdByKey[resourceKey];
        if (!resourceId) continue;
        await db
          .insert(schema.stepResources)
          .values({ stepId: stepRow.id, resourceId, sortOrder: index })
          .onConflictDoNothing();
      }
    }

    console.log('→ personas (hidden facts stay server-side)');
    for (const persona of listPersonas(scenario.scenarioKey)) {
      await db
        .insert(schema.aiPersonas)
        .values({
          scenarioVersionId: versionRow.id,
          key: persona.key,
          name: persona.name,
          role: persona.role,
          organization: persona.organization,
          avatarColor: persona.avatarColor,
          visibleContext: persona.visibleContext,
          openingMessage: persona.openingMessage,
          systemPrompt: persona.systemPrompt,
          conversationRules: persona.conversationRules,
        })
        .onConflictDoUpdate({
          target: schema.aiPersonas.key,
          set: {
            scenarioVersionId: versionRow.id,
            name: persona.name,
            role: persona.role,
            organization: persona.organization,
            avatarColor: persona.avatarColor,
            visibleContext: persona.visibleContext,
            openingMessage: persona.openingMessage,
            systemPrompt: persona.systemPrompt,
            conversationRules: persona.conversationRules,
          },
        });

      for (const fact of persona.facts) {
        await db
          .insert(schema.personaFacts)
          .values({
            id: fact.id,
            personaKey: persona.key,
            label: fact.label,
            content: fact.content,
            visibility: fact.visibility,
            disclosureRule: fact.disclosureRule,
            triggerTopics: fact.triggerTopics,
          })
          .onConflictDoUpdate({
            target: schema.personaFacts.id,
            set: {
              label: fact.label,
              content: fact.content,
              visibility: fact.visibility,
              disclosureRule: fact.disclosureRule,
              triggerTopics: fact.triggerTopics,
            },
          });
      }
    }
  }

  console.log('\n✓ Seed complete.');
}

async function main() {
  const db = getDb();
  if (!db) {
    console.error(
      'DATABASE_URL is not set. Seeding is only meaningful against Neon.\n' +
        'The app itself runs without it using the local file store.',
    );
    process.exit(1);
  }
  await seed(db);
}

// Only run when invoked directly (`npm run db:seed`), not when imported.
if (process.argv[1] && process.argv[1].includes('seed/run')) {
  main().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}
