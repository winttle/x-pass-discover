/**
 * Scenario imagery.
 *
 * The photography is concept-stage fictional material produced for X-PASS and
 * committed under `assets-src/`; `scripts/build-image-assets.sh` derives the
 * web-ready crops in `public/img/`. Read that script before changing an image:
 * two of the crops exist to keep a superseded company wordmark out of frame.
 *
 * Every image is addressed by path here, so re-shooting or re-generating one is
 * a change to this file (or to the build script) and nothing else.
 */
export const MEDIA = {
  companyHero: {
    src: '/img/cover/bite-office.webp',
    alt: 'The BITE team reviewing food photography together in their office',
  },
  product: {
    src: '/img/product/bite-protein-drink.webp',
    alt: 'BITE Protein Drink in Chocolate, Vanilla Bean, Strawberry and Matcha',
  },
  account: {
    src: '/img/account/quickmart.webp',
    alt: 'A QuickMart convenience store at dusk',
  },
} as const;
