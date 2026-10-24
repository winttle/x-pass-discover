'use client';

import { Badge, Card, CardHeader } from '@/components/ui';
import { BITE_UNIT_ECONOMICS } from '@/content/company';
import { useT } from '@/i18n/client';
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
  const t = useT();
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
      t('economics.marginAmount'),
      yen(economics.retailMarginAmountYen),
      t('economics.marginAmountFormula'),
    ],
    [
      t('economics.marginRate'),
      economics.retailMarginRate === null
        ? '—'
        : `${(economics.retailMarginRate * 100).toFixed(1)}%`,
      t('economics.marginRateFormula'),
    ],
    [
      t('economics.contributionBefore'),
      yen(economics.biteUnitContributionBeforeExtraYen),
      t('economics.contributionBeforeFormula', {
        mfg: BITE_UNIT_ECONOMICS.manufacturingCostYen,
        cold: BITE_UNIT_ECONOMICS.coldLogisticsYen,
        promo: BITE_UNIT_ECONOMICS.basePromotionYen,
      }),
    ],
    [
      t('economics.contributionAfter'),
      yen(economics.biteUnitContributionYen),
      t('economics.contributionAfterNote'),
    ],
  ];

  return (
    <Card>
      <CardHeader
        title={t('economics.title')}
        subtitle={t('economics.subtitle')}
        right={<Badge tone="muted">{t('economics.live')}</Badge>}
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
            {t('economics.projection', {
              stores: String(value.store_count ?? '—'),
              days: pilotDays,
            })}{' '}
            <span className="font-mono text-strong">
              {t('economics.units', { units: economics.expectedPilotUnits.toLocaleString() })}
            </span>
            {economics.expectedBiteContributionYen !== null ? (
              <>
                {' '}
                {t('economics.contribution')}{' '}
                <span className="font-mono text-strong">
                  {yen(economics.expectedBiteContributionYen)}
                </span>
              </>
            ) : null}
          </p>
          <p className="mt-1 text-[10px] text-muted">
            {t('economics.illustration')}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
