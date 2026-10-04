'use client';

import { Badge, Card, CardHeader } from '@/components/ui';
import { BITE_UNIT_ECONOMICS } from '@/content/company';
import { computeDealEconomics } from '@/services/scenario/calculators';
import type { AnswerValue } from '@/types/runtime';

const yen = (n: number | null) =>
  n === null ? '—' : `¥${Math.round(n).toLocaleString()}`;

/**
 * Live commercial helpers.
 *
 * Shows the arithmetic and nothing else: no recommended value, no auto-fill,
 * no "optimal" highlight. The student decides.
 */
export function DealEconomicsPanel({ value }: { value: AnswerValue }) {
  const pilotDays = 28;
  const economics = computeDealEconomics({
    wholesalePriceYen: value.wholesale_price_yen as number | null,
    retailPriceYen: value.retail_price_yen as number | null,
    extraPromotionYen: value.extra_promotion_yen as number | null,
    storeCount: value.store_count as number | null,
    unitsPerStorePerDay: value.sales_target_units_per_store_per_day as number | null,
    pilotDays,
  });

  const rows: Array<[string, string, string?]> = [
    [
      'Retail margin (amount)',
      yen(economics.retailMarginAmountYen),
      'Retail price − wholesale price',
    ],
    [
      'Retail margin (rate)',
      economics.retailMarginRate === null
        ? '—'
        : `${(economics.retailMarginRate * 100).toFixed(1)}%`,
      '(Retail − wholesale) ÷ retail',
    ],
    [
      'BITE contribution before extra promo',
      yen(economics.biteUnitContributionBeforeExtraYen),
      `Wholesale − ¥${BITE_UNIT_ECONOMICS.manufacturingCostYen} mfg − ¥${BITE_UNIT_ECONOMICS.coldLogisticsYen} cold − ¥${BITE_UNIT_ECONOMICS.basePromotionYen} base promo`,
    ],
    [
      'BITE contribution after extra promo',
      yen(economics.biteUnitContributionYen),
      'Extra promotion is not free — it comes out of contribution',
    ],
  ];

  return (
    <Card>
      <CardHeader
        title="Deal economics"
        subtitle="Calculated from your inputs — it does not decide for you"
        right={<Badge tone="muted">live</Badge>}
      />
      <dl className="divide-y divide-line">
        {rows.map(([label, display, formula]) => (
          <div key={label} className="flex items-start justify-between gap-3 px-5 py-2.5">
            <div className="min-w-0">
              <dt className="text-xs text-body">{label}</dt>
              {formula ? (
                <p className="mt-0.5 text-[10px] text-muted">{formula}</p>
              ) : null}
            </div>
            <dd className="shrink-0 font-mono text-sm text-strong">{display}</dd>
          </div>
        ))}
      </dl>

      {economics.expectedPilotUnits !== null ? (
        <div className="border-t border-line px-5 py-3">
          <p className="text-[11px] text-muted">
            At your target rate across {String(value.store_count ?? '—')} stores for{' '}
            {pilotDays} days:{' '}
            <span className="font-mono text-strong">
              {economics.expectedPilotUnits.toLocaleString()} units
            </span>
            {economics.expectedBiteContributionYen !== null ? (
              <>
                {' '}
                → BITE contribution{' '}
                <span className="font-mono text-strong">
                  {yen(economics.expectedBiteContributionYen)}
                </span>
              </>
            ) : null}
          </p>
          <p className="mt-1 text-[10px] text-muted">
            A 4-week illustration. Your own pilot length may differ — state it in your
            proposal.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
