/**
 * Scenario imagery.
 *
 * The photography is concept-stage fictional material produced for X-PASS and
 * committed under `assets-src/`; `scripts/build-image-assets.sh` derives the
 * web-ready crops in `public/img/`. Read that script before changing an image:
 * several of the crops exist to keep a superseded company wordmark out of frame.
 *
 * Every image is addressed by path here, so re-shooting or re-generating one is
 * a change to this file (or to the build script) and nothing else. Each entry is
 * named for the job it does rather than what it depicts, so a re-shoot can
 * change the picture without renaming anything.
 */
export const MEDIA = {
  /** Outside, arriving: the headquarters, signage reading BITE. */
  companyExterior: {
    src: '/img/cover/bite-hq.webp',
    alt: 'BITE headquarters at golden hour, its entrance open onto the plaza',
  },
  /** Inside, at work: used for the in-app banners once the student is signed in. */
  companyOffice: {
    src: '/img/cover/bite-office.webp',
    alt: 'The BITE team reviewing food photography together in their office',
  },
  /**
   * Dusk, printed charts, a decision being reconsidered. Dark enough to carry
   * white type, so it backs the decision-revision band.
   */
  decisionDesk: {
    src: '/img/scene/decision-desk.webp',
    alt: 'Printed charts spread across a desk at dusk, a laptop open beside them',
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
