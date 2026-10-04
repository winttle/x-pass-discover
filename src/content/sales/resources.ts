import type { ResourceDefinition } from '@/types/resource';
import {
  BITE_PROTEIN_DRINK,
  BITE_SALES_GUARDRAILS,
  BITE_UNIT_ECONOMICS,
} from '@/content/company';

const g = BITE_SALES_GUARDRAILS;
const e = BITE_UNIT_ECONOMICS;

/**
 * Data Room contents for the Sales scenario.
 *
 * These are PUBLIC: anything here is readable by the student at any time.
 * Category-level benchmarks live here; the QuickMart-specific refinements of
 * those same numbers are hidden buyer facts and must be earned by asking.
 * See `personas.server.ts`.
 */
export const SALES_RESOURCES: ResourceDefinition[] = [
  {
    key: 'sales-training-1pager',
    title: 'Sales Starter: how professionals think',
    description:
      'Role mindset, key concepts and frameworks. Read this before the scenario begins.',
    resourceType: 'training',
    visibility: 'scenario',
    sortOrder: 0,
    body: {
      kind: 'markdown',
      markdown: `## Role mindset

> **Sales is not about pushing a product. It is about understanding the customer's business and designing a deal that creates value for both sides.**

Before asking:

> How can I sell our product?

Ask:

> **What is the customer trying to achieve?**

## Key concepts

| Concept | Meaning |
|---|---|
| Account Hypothesis | Preliminary view of the customer's goals, problems and risks before a meeting |
| Business Goal | Outcome the customer ultimately wants to achieve |
| Need | What the customer needs to solve the problem |
| Constraint | Condition that is difficult to change, such as budget, shelf space or capacity |
| Decision Criteria | Factors the buyer uses to decide |
| Value Proposition | How product capability becomes value for this specific customer |
| Unit Economics | Revenue / cost / margin structure per unit |
| Guardrail | Minimum or maximum condition that should not be crossed |
| Trade-off | Giving something in one area in exchange for value in another |
| Pilot | Limited test before scaling |
| Success Criteria | Evidence threshold for expansion or continuation |

## Important ways of thinking

1. **Understand before you pitch.**
2. **A hypothesis is not a fact.**
3. **Stated request ≠ real need.**
4. **Feature ≠ value.**
5. **Do not negotiate only on price.**
6. **A closed deal is not always a good deal.**

## Frameworks

**Discovery**

\`\`\`
Ask → Listen → Probe → Confirm → Adapt
\`\`\`

**Value creation**

\`\`\`
Feature → Customer Benefit → Business Impact → Evidence
\`\`\`

**Negotiation**

\`\`\`
Priority → Guardrail → Trade-off → Agreement
\`\`\`

## Core line

> **Ask why behind the request.**

If a buyer says "Your price is too high," investigate whether the real issue is margin, sell-through risk, waste, competitor pricing or internal approval.`,
    },
  },
  {
    key: 'bite-company-profile',
    title: 'BITE company profile',
    description: 'Who BITE is and how the Distribution Sales team operates.',
    resourceType: 'company_profile',
    visibility: 'scenario',
    sortOrder: 1,
    body: {
      kind: 'markdown',
      markdown: `**BITE** is a casual F&B brand operating stores, takeout, delivery and digital channels.

The **Distribution Sales** team sells BITE packaged products into retail channels — convenience stores, supermarkets and drug stores. A listing decision at a national chain is made by a *category buyer*, who is responsible for the sales and profitability of an entire shelf category, not for any single supplier.

A buyer's shelf is finite. Adding a new product usually means removing another one. That is the real competition.

### What the Distribution Sales team is measured on

- Listings won at commercially viable conditions, not listings won at any price
- Sell-through after launch, because a delisted product costs more than a lost pitch
- Contribution per unit against BITE's internal guardrails
- Long-term account relationships`,
    },
  },
  {
    key: 'bite-protein-drink-sheet',
    title: 'BITE Protein Drink — product sheet',
    description: 'Specification, pricing, strengths and limitations.',
    resourceType: 'product_sheet',
    visibility: 'scenario',
    sortOrder: 2,
    body: {
      kind: 'markdown',
      markdown: `| Item | Value |
|---|---|
| Product | ${BITE_PROTEIN_DRINK.name} |
| Size | ${BITE_PROTEIN_DRINK.attributes.size} |
| Protein | ${BITE_PROTEIN_DRINK.attributes.protein} |
| Calories | ${BITE_PROTEIN_DRINK.attributes.calories} |
| Storage | ${BITE_PROTEIN_DRINK.attributes.storage} |
| Shelf life | ${BITE_PROTEIN_DRINK.attributes.shelfLifeDays} days |
| Flavors | ${BITE_PROTEIN_DRINK.attributes.flavors.join(' / ')} |
| Recommended retail price | ¥${BITE_PROTEIN_DRINK.attributes.recommendedRetailPriceYen} |
| Standard QuickMart wholesale | ¥${BITE_PROTEIN_DRINK.attributes.standardWholesalePriceYen} |
| Pack size | ${BITE_PROTEIN_DRINK.attributes.packSize} |
| Core target | ${BITE_PROTEIN_DRINK.attributes.coreTarget} |

### Strengths

${BITE_PROTEIN_DRINK.attributes.strengths.map((s) => `- ${s}`).join('\n')}

### Limitations

${BITE_PROTEIN_DRINK.attributes.limitations.map((s) => `- ${s}`).join('\n')}`,
    },
  },
  {
    key: 'bite-unit-economics',
    title: 'BITE Protein Drink — unit economics',
    description: 'Per-unit cost structure and base contribution.',
    resourceType: 'data_table',
    visibility: 'scenario',
    sortOrder: 3,
    body: {
      kind: 'table',
      columns: ['Item', 'Per unit'],
      rows: [
        ['Recommended retail price', `¥${e.recommendedRetailPriceYen}`],
        ['Standard wholesale price', `¥${e.standardWholesalePriceYen}`],
        ['Manufacturing cost', `¥${e.manufacturingCostYen}`],
        ['Cold logistics', `¥${e.coldLogisticsYen}`],
        ['Base promotion', `¥${e.basePromotionYen}`],
        ['Base BITE contribution', `¥${e.baseContributionYen}`],
      ],
      note: `Base contribution: ${e.standardWholesalePriceYen} − ${e.manufacturingCostYen} − ${e.coldLogisticsYen} − ${e.basePromotionYen} = ${e.baseContributionYen}. Any extra promotion you offer reduces contribution further — it is never free.`,
    },
  },
  {
    key: 'bite-sales-guardrails',
    title: 'BITE internal sales guardrails',
    description:
      'Internal BITE policy. The buyer does not know these minimums — do not present them as QuickMart constraints.',
    resourceType: 'policy',
    visibility: 'scenario',
    sortOrder: 4,
    body: {
      kind: 'markdown',
      markdown: `These are **BITE's internal limits**. QuickMart is not told them.

- Minimum wholesale price: **¥${g.minWholesalePriceYen}**
- Minimum unit contribution from the price structure: **¥${g.minUnitContributionYen}**, before any extra promotion beyond the defined base structure
- Extra promotion support: **max ¥${g.maxExtraPromotionYen}/unit**
- **No full return guarantee**
- Payment terms: up to **${g.maxPaymentTermDays} days**
- Minimum production run: **${g.minProductionRunUnits.toLocaleString()} units**
- Do not accept a deal below break-even

If you add promotion support, calculate its impact explicitly. It comes out of contribution.`,
    },
  },
  {
    key: 'quickmart-account-profile',
    title: 'QuickMart — account profile',
    description: 'Chain overview, current issues and category direction.',
    resourceType: 'account_profile',
    visibility: 'scenario',
    sortOrder: 5,
    body: {
      kind: 'markdown',
      markdown: `QuickMart is a Japanese convenience store chain.

| Item | Value |
|---|---|
| Stores | Approx. 1,200 across Japan |
| Customer trend | Visits from age 18–29 are increasing |
| Current issue | Morning 7:00–10:00 sales are stagnant |
| Category direction | Wants to expand health beverages |
| Physical constraint | Refrigerated shelf space is limited |

### Stated business goals

- Increase morning beverage sales by **15%**
- Expand the health beverage category
- Keep new-product waste at **5% or lower**
- Attract office workers in their 20s
- Introduce differentiated products

### Known decision criteria

- Target retail price should be **¥300 or lower**
- Retail margin target: **35% or more**
- Prefers a limited-store pilot before full rollout
- May discontinue after 4 weeks if sales are weak
- If successful, rollout can expand to up to **1,200 stores**`,
    },
  },
  {
    key: 'quickmart-category-data',
    title: 'QuickMart — public category data',
    description:
      'Category-level benchmarks available before the meeting. The buyer knows more specific numbers than these.',
    resourceType: 'data_table',
    visibility: 'scenario',
    sortOrder: 6,
    body: {
      kind: 'table',
      columns: ['Metric', 'Value'],
      rows: [
        ['Age 18–29 customer share', '31%'],
        ['Morning sales share', '18%'],
        ['Health beverage category growth', '+15% YoY'],
        ['Repurchase rate', '28%'],
        ['Avg. morning protein drink sales', '2.4 units/store/day'],
        ['Refrigerated beverage waste', '4.2%'],
        ['Customer willingness to pay', '¥250–300'],
      ],
      note: 'These are category averages. The buyer can tell you how they break down inside QuickMart — but only if you ask about the right thing.',
    },
  },
  {
    key: 'competitor-comparison',
    title: 'Competitor comparison',
    description: 'Protein drinks currently competing for the same shelf.',
    resourceType: 'data_table',
    visibility: 'scenario',
    sortOrder: 7,
    body: {
      kind: 'table',
      columns: [
        'Product',
        'Size / Protein',
        'Retail',
        'Wholesale',
        'Positioning',
        'Weakness',
      ],
      rows: [
        ['FitDrink', '300 ml / 15 g', '¥278', '¥158', 'Low price / awareness', 'Lower protein'],
        ['BodyGo', '350 ml / 20 g', '¥328', '¥198', 'Premium', 'Expensive'],
        ['Morning Plus', '250 ml / 10 g', '¥248', '¥145', 'Morning positioning / stable', 'Low differentiation'],
        ['BITE Protein Drink', '330 ml / 20 g', '¥298', '¥178', 'Meal replacement / taste', 'Low awareness'],
      ],
    },
  },
  {
    key: 'pilot-structure-options',
    title: 'Pilot structure options (decision aid)',
    description:
      'Three starting points. None of them is the correct answer — you may design your own.',
    resourceType: 'memo',
    visibility: 'scenario',
    sortOrder: 8,
    body: {
      kind: 'markdown',
      markdown: `These are **decision aids, not correct answers**. You may design a different structure as long as BITE's guardrails are respected.

### A. Kansai — 120 stores
- Concentrated
- Easier operational control
- Smaller sample

### B. Nationwide — 300 stores
- Broader market data
- Faster awareness
- Greater production and waste risk, higher operational complexity

### C. Office districts — 80 stores
- Strong target fit
- Clear morning / breakfast hypothesis
- Weaker generalisability`,
    },
  },
];
