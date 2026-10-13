import { DEPARTMENTS } from './departments';

/**
 * The pre-survey, one question per screen.
 *
 * This is the only place questions live: add, remove or reorder entries here
 * and the survey screen, its progress counter and the saved answers follow.
 * Each answer is stored under its `key`, so keys must be unique and should
 * not change once students have answered them.
 *
 * The career report reads `interest_<department slug>` (1–5) as the LIKE side
 * of each department, so keep those keys while the report depends on them.
 */
export type PreSurveyQuestion =
  | {
      key: string;
      kind: 'scale';
      prompt: string;
      /** Words under the two ends of the 1–5 scale. */
      low?: string;
      high?: string;
    }
  | {
      key: string;
      kind: 'text';
      prompt: string;
      placeholder?: string;
      /** Optional text questions can be left blank. */
      optional?: boolean;
    };

const SCALE_LOW = 'Not at all';
const SCALE_HIGH = 'Very much';

// Placeholder content: these are the questions the survey asked before the
// redesign. Replace or extend them with the final question set.
export const PRE_SURVEY_QUESTIONS: PreSurveyQuestion[] = [
  ...DEPARTMENTS.map(
    (department): PreSurveyQuestion => ({
      key: `interest_${department.slug}`,
      kind: 'scale',
      prompt: `I am interested in ${department.name} work — ${department.tagline.replace(/\?$/, '').toLowerCase()}?`,
      low: SCALE_LOW,
      high: SCALE_HIGH,
    }),
  ),
  {
    key: 'self_hypothesis',
    kind: 'text',
    prompt: 'What kind of work do you think suits you, and why?',
    placeholder: 'Your current hypothesis about yourself.',
  },
  {
    key: 'experience',
    kind: 'text',
    prompt: 'Any work experience so far?',
    placeholder: 'Part-time jobs, internships, clubs, projects…',
    optional: true,
  },
];
