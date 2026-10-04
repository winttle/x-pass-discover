/**
 * Scenario imagery.
 *
 * The artwork is first-party SVG illustration committed to `public/img`, not
 * stock photography: the company, the buyer and the account are fictional, so
 * photographs of real people and real shops would be both a licensing problem
 * and a misrepresentation. Every image is addressed by path here, so swapping
 * in commissioned photography later is a change to this file and nothing else.
 */
export const MEDIA = {
  companyHero: {
    src: '/img/cover/bite-office.svg',
    alt: 'The BITE head office',
  },
  product: {
    src: '/img/product/bite-protein-drink.svg',
    alt: 'A bottle of BITE Protein Drink',
  },
  account: {
    src: '/img/account/quickmart.svg',
    alt: 'A QuickMart convenience store',
  },
} as const;
