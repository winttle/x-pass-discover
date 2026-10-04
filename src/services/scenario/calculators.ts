import { BITE_UNIT_ECONOMICS } from '@/content/company';

/**
 * Commercial calculators.
 *
 * These show the student the arithmetic. They never choose a value, never
 * rewrite an answer, and never block a submission.
 */

export type DealEconomicsInput = {
  wholesalePriceYen?: number | null;
  retailPriceYen?: number | null;
  extraPromotionYen?: number | null;
  storeCount?: number | null;
  unitsPerStorePerDay?: number | null;
  pilotDays?: number | null;
};

export type DealEconomics = {
  retailMarginAmountYen: number | null;
  retailMarginRate: number | null;
  biteUnitContributionYen: number | null;
  /** Contribution before any extra promotion — the guardrail floor applies here. */
  biteUnitContributionBeforeExtraYen: number | null;
  expectedPilotUnits: number | null;
  expectedBiteContributionYen: number | null;
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export function computeDealEconomics(input: DealEconomicsInput): DealEconomics {
  const wholesale = num(input.wholesalePriceYen);
  const retail = num(input.retailPriceYen);
  const extraPromotion = num(input.extraPromotionYen) ?? 0;
  const stores = num(input.storeCount);
  const perStorePerDay = num(input.unitsPerStorePerDay);
  const days = num(input.pilotDays);

  const retailMarginAmountYen =
    retail !== null && wholesale !== null ? retail - wholesale : null;
  const retailMarginRate =
    retailMarginAmountYen !== null && retail !== null && retail > 0
      ? retailMarginAmountYen / retail
      : null;

  const contributionBeforeExtra =
    wholesale !== null
      ? wholesale -
        BITE_UNIT_ECONOMICS.manufacturingCostYen -
        BITE_UNIT_ECONOMICS.coldLogisticsYen -
        BITE_UNIT_ECONOMICS.basePromotionYen
      : null;

  const contribution =
    contributionBeforeExtra !== null
      ? contributionBeforeExtra - extraPromotion
      : null;

  const expectedPilotUnits =
    stores !== null && perStorePerDay !== null && days !== null
      ? Math.round(stores * perStorePerDay * days)
      : null;

  const expectedBiteContributionYen =
    expectedPilotUnits !== null && contribution !== null
      ? Math.round(expectedPilotUnits * contribution)
      : null;

  return {
    retailMarginAmountYen,
    retailMarginRate,
    biteUnitContributionYen: contribution,
    biteUnitContributionBeforeExtraYen: contributionBeforeExtra,
    expectedPilotUnits,
    expectedBiteContributionYen,
  };
}

export const CALCULATOR_KEYS = ['deal-economics'] as const;
export type CalculatorKey = (typeof CALCULATOR_KEYS)[number];
