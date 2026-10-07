'use client';

import Image from 'next/image';
import { Card, CardHeader } from '@/components/ui';
import type { ScenarioStepMedia } from '@/types/scenario';

/**
 * The step's reference material — the account you are researching, the product
 * you are pricing. Content supplies it per step, so it is not Sales-specific.
 *
 * The figures come from the scenario's own constants, so this panel can never
 * disagree with the Data Room or the calculators.
 */
export function ReferencePanel({ media }: { media: ScenarioStepMedia }) {
  return (
    <Card>
      <CardHeader title="Reference" subtitle={media.title} />
      <div className="relative h-40 border-b border-line bg-sunken">
        <Image
          src={media.src}
          alt={media.alt}
          fill
          sizes="(max-width: 1280px) 100vw, 340px"
          className="object-cover"
        />
      </div>
      <div className="px-5 py-3.5">
        {media.caption ? (
          <p className="text-[11px] leading-relaxed text-muted">{media.caption}</p>
        ) : null}
        {media.facts?.length ? (
          <dl className="mt-3 space-y-1.5">
            {media.facts.map((fact) => (
              <div key={fact.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] text-muted">{fact.label}</dt>
                <dd className="font-mono text-xs font-medium text-strong">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </Card>
  );
}
