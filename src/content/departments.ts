import type { DepartmentDefinition } from '@/types/scenario';

/**
 * The five BITE departments.
 *
 * `productKey: null` is meaningful, not missing data: Product Management starts
 * from a customer problem with no product yet, and Strategy has no assigned
 * product at all. This is why `projects.product_id` is nullable.
 */
export const DEPARTMENTS: DepartmentDefinition[] = [
  {
    slug: 'marketing',
    name: 'Marketing',
    tagline: 'How should we market it?',
    description:
      'Plan the launch of Spicy Crispy Chicken Bites: who it is for, how it reaches them, and how success is measured.',
    productKey: 'spicy-crispy-chicken-bites',
    projectKey: 'marketing-spicy-crispy-launch',
    projectTitle: 'Spicy Crispy Chicken Bites Launch',
    coreQuestion: 'How should we market it?',
    finalOutput: 'Marketing Handover Memo',
    officeZoneKey: 'marketing-zone',
    accentColor: '#db2777',
    coverImage: '/img/cover/marketing.svg',
    status: 'coming_soon',
    scenarioKey: null,
  },
  {
    slug: 'sales',
    name: 'Sales',
    tagline: 'How do we win the deal?',
    description:
      'Get BITE Protein Drink listed at QuickMart under commercially viable conditions — research the account, meet the buyer, design the deal, and negotiate.',
    productKey: 'bite-protein-drink',
    projectKey: 'sales-quickmart-protein-drink',
    projectTitle: 'BITE Protein Drink × QuickMart',
    coreQuestion: 'How do we win the deal?',
    finalOutput: 'QuickMart Sales Proposal',
    officeZoneKey: 'sales-zone',
    accentColor: '#2563eb',
    coverImage: '/img/cover/sales.svg',
    status: 'playable',
    scenarioKey: 'sales-quickmart',
  },
  {
    slug: 'product-management',
    name: 'Product Management',
    tagline: 'What should we create?',
    description:
      'Start from a customer problem — not a product — and decide what BITE should put on the spring seasonal menu.',
    // No product exists at the start of this project.
    productKey: null,
    projectKey: 'pm-spring-seasonal-menu',
    projectTitle: 'Spring Seasonal Menu Planning',
    coreQuestion: 'What should we create?',
    finalOutput: 'Product Planning Decision Brief',
    officeZoneKey: 'product-zone',
    accentColor: '#16a34a',
    coverImage: '/img/cover/product.svg',
    status: 'coming_soon',
    scenarioKey: null,
  },
  {
    slug: 'strategy',
    name: 'Strategy',
    tagline: 'Where should BITE grow?',
    description:
      'A company-level growth project with no assigned product: decide where BITE should invest to grow by 2027.',
    productKey: null,
    projectKey: 'strategy-bite-2027-growth',
    projectTitle: 'BITE 2027 Growth Strategy',
    coreQuestion: 'Where should BITE grow?',
    finalOutput: 'Strategic Decision Report',
    officeZoneKey: 'strategy-zone',
    accentColor: '#7c3aed',
    coverImage: '/img/cover/strategy.svg',
    status: 'coming_soon',
    scenarioKey: null,
  },
  {
    slug: 'human-resources',
    name: 'Human Resources',
    tagline: 'Who should we hire?',
    description:
      'Diagnose capability gaps for the BITE Protein Drink CN expansion, define job-related criteria, interview candidates, and recommend who to hire.',
    productKey: 'bite-protein-drink',
    projectKey: 'hr-cn-expansion-talent',
    projectTitle: 'Talent Acquisition for BITE Protein Drink × CN Expansion',
    coreQuestion: 'Who should we hire?',
    finalOutput: 'Final Hiring Recommendation',
    officeZoneKey: 'hr-zone',
    accentColor: '#ea580c',
    coverImage: '/img/cover/hr.svg',
    status: 'coming_soon',
    scenarioKey: null,
  },
];

export function getDepartment(slug: string): DepartmentDefinition | null {
  return DEPARTMENTS.find((d) => d.slug === slug) ?? null;
}

export function getPlayableDepartments(): DepartmentDefinition[] {
  return DEPARTMENTS.filter((d) => d.status === 'playable');
}
