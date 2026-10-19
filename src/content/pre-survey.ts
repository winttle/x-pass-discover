import type { Locale } from '@/i18n/config';

/**
 * The pre-survey, one question per screen.
 *
 * This is the only place questions live: add, remove or reorder entries here
 * and the survey screen, its progress counter and the saved answers follow.
 * Each answer is stored under its `key`, so keys must be unique and should
 * not change once students have answered them.
 *
 * Every piece of text is written once per language. English is required; a
 * language left out falls back to English.
 *
 * The career report reads `interest_<department slug>` (1–5) as the LIKE side
 * of each department, so keep those keys while the report depends on them.
 */
export type Localized = { en: string } & Partial<Record<Exclude<Locale, 'en'>, string>>;

export const localize = (text: Localized, locale: Locale): string => text[locale] ?? text.en;

export type PreSurveyQuestion =
  | {
      key: string;
      kind: 'scale';
      prompt: Localized;
      /** Words under the two ends of the 1–5 scale; the defaults are "Not at all" / "Very much". */
      low?: Localized;
      high?: Localized;
    }
  | {
      key: string;
      kind: 'text';
      prompt: Localized;
      placeholder?: Localized;
      /** Optional text questions can be left blank. */
      optional?: boolean;
    };

// Placeholder content: these are the questions the survey asked before the
// redesign. Replace or extend them with the final question set.
export const PRE_SURVEY_QUESTIONS: PreSurveyQuestion[] = [
  {
    key: 'interest_marketing',
    kind: 'scale',
    prompt: {
      en: 'I am interested in Marketing work — how should we market it?',
      ja: 'マーケティングの仕事（どう売り出すかを考える）に興味がある。',
      ko: '마케팅 업무(어떻게 알릴지 고민하는 일)에 관심이 있다.',
    },
  },
  {
    key: 'interest_sales',
    kind: 'scale',
    prompt: {
      en: 'I am interested in Sales work — how do we win the deal?',
      ja: '営業の仕事（どう取引を勝ち取るかを考える）に興味がある。',
      ko: '영업 업무(어떻게 거래를 따낼지 고민하는 일)에 관심이 있다.',
    },
  },
  {
    key: 'interest_product-management',
    kind: 'scale',
    prompt: {
      en: 'I am interested in Product Management work — what should we create?',
      ja: 'プロダクトマネジメントの仕事（何をつくるかを考える）に興味がある。',
      ko: '프로덕트 매니지먼트 업무(무엇을 만들지 고민하는 일)에 관심이 있다.',
    },
  },
  {
    key: 'interest_strategy',
    kind: 'scale',
    prompt: {
      en: 'I am interested in Strategy work — where should BITE grow?',
      ja: '経営戦略の仕事（BITEがどこで成長すべきかを考える）に興味がある。',
      ko: '경영 전략 업무(BITE가 어디서 성장해야 할지 고민하는 일)에 관심이 있다.',
    },
  },
  {
    key: 'interest_human-resources',
    kind: 'scale',
    prompt: {
      en: 'I am interested in Human Resources work — who should we hire?',
      ja: '人事の仕事（誰を採用すべきかを考える）に興味がある。',
      ko: '인사 업무(누구를 채용할지 고민하는 일)에 관심이 있다.',
    },
  },
  {
    key: 'self_hypothesis',
    kind: 'text',
    prompt: {
      en: 'What kind of work do you think suits you, and why?',
      ja: 'どんな仕事が自分に合っていると思いますか？ その理由も教えてください。',
      ko: '어떤 일이 나에게 맞는다고 생각하나요? 그 이유도 알려 주세요.',
    },
    placeholder: {
      en: 'Your current hypothesis about yourself.',
      ja: '今の自分についての仮説を書いてください。',
      ko: '지금 나에 대해 세운 가설을 적어 주세요.',
    },
  },
  {
    key: 'experience',
    kind: 'text',
    prompt: {
      en: 'Any work experience so far?',
      ja: 'これまでに仕事の経験はありますか？',
      ko: '지금까지 일해 본 경험이 있나요?',
    },
    placeholder: {
      en: 'Part-time jobs, internships, clubs, projects…',
      ja: 'アルバイト、インターン、サークル、プロジェクトなど',
      ko: '아르바이트, 인턴십, 동아리, 프로젝트 등',
    },
    optional: true,
  },
];
