/**
 * Scenario engine domain types.
 *
 * These types are department-agnostic on purpose: Sales is the first vertical
 * slice, but nothing here may encode Sales-specific assumptions. Marketing, PM,
 * Strategy and HR must be expressible as data against these same types.
 */

export type StepType =
  | 'training'
  | 'briefing'
  | 'research'
  | 'analysis'
  | 'ai_interaction'
  | 'decision'
  | 'unexpected_event'
  | 'revision'
  | 'final_submission';

export type TaskFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'repeatable_group'
  | 'resource_evidence';

/**
 * `epistemicKind` drives the UI distinction the spec requires between a
 * confirmed fact/evidence and the student's own hypothesis. It is presentation
 * metadata only — it never affects scoring.
 */
export type EpistemicKind = 'fact' | 'hypothesis' | 'neutral';

export type TaskFieldOption = { label: string; value: string };

export type TaskField = {
  key: string;
  label: string;
  type: TaskFieldType;
  required?: boolean;
  helpText?: string;
  placeholder?: string;
  options?: TaskFieldOption[];
  epistemicKind?: EpistemicKind;
  /** For `repeatable_group`: the shape of one row. */
  fields?: TaskField[];
  /** For `repeatable_group`: row count expectations. */
  minRows?: number;
  maxRows?: number;
  /** Seed the editor with this many blank rows. */
  initialRows?: number;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  /**
   * Seed this field from earlier answers, e.g.
   *   "{{proposal-v1.test_region}}" or "{{meeting-prep.questions[].question}}".
   * Resolved by `lib/prefill.ts`. Keeps "pull data forward from prior steps"
   * declarative instead of hard-coding one composer per scenario.
   */
  prefillTemplate?: string;
  /**
   * For `resource_evidence`: where the selectable evidence comes from. Declared
   * in content so the generic editor never needs to know a persona key.
   */
  evidenceSources?: Array<
    | { kind: 'resources' }
    | { kind: 'conversation'; personaKey: string; stepKey: string }
  >;
  /**
   * Opt-in commercial helpers (margin, contribution). The engine stays generic:
   * the calculator itself is registered by key in the calculators registry.
   */
  calculatorKey?: string;
};

export type TaskKind =
  | 'form'
  | 'reading'
  | 'acknowledge'
  | 'ai_conversation'
  | 'final_submission';

export type TaskCompletionRule =
  | { type: 'submitted' }
  | { type: 'required_fields' }
  | { type: 'min_rows'; fieldKey: string; min: number }
  | { type: 'acknowledged' }
  | {
      type: 'conversation_ended';
      personaKey: string;
      minStudentMessages?: number;
    }
  | { type: 'all'; rules: TaskCompletionRule[] };

export type TaskDefinition = {
  key: string;
  title: string;
  instructions?: string;
  kind: TaskKind;
  required?: boolean;
  fields?: TaskField[];
  /** For `ai_conversation` tasks. */
  personaKey?: string;
  /** For `final_submission`/revision tasks: prefill from an earlier answer. */
  prefillFromTaskKey?: string;
  /** Task keys whose answers are shown read-only alongside this task. */
  referenceTaskKeys?: string[];
  completion: TaskCompletionRule;
  /** Keys of guardrail checks to evaluate on save. Warn, never auto-correct. */
  guardrailKeys?: string[];
};

export type UnlockRule =
  | { type: 'always' }
  | { type: 'step_completed'; stepKey: string }
  | { type: 'task_submitted'; taskKey: string }
  | { type: 'conversation_completed'; personaKey: string; stepKey?: string }
  | { type: 'all'; rules: UnlockRule[] }
  | { type: 'any'; rules: UnlockRule[] };

export type StepCompletionRule =
  | { type: 'all_required_tasks' }
  | { type: 'manual' };

export type ScenarioStepDefinition = {
  key: string;
  title: string;
  stepType: StepType;
  summary?: string;
  instructions?: string;
  estimatedMinutes?: number;
  sortOrder: number;
  unlockRule: UnlockRule;
  completionRule: StepCompletionRule;
  tasks: TaskDefinition[];
  /** Resource keys surfaced for this step (Data Room still lists all public). */
  resourceKeys?: string[];
  /** Office zone that hosts this step, used by the Phaser layer for wayfinding. */
  officeZoneKey?: string;
  /** Structured payload for `unexpected_event` steps (not just a text popup). */
  eventPayload?: ScenarioEventPayload;
};

export type ScenarioEventPayload = {
  headline: string;
  from: string;
  body: string;
  facts?: Array<{ label: string; value: string }>;
};

export type ScenarioVersionDefinition = {
  scenarioKey: string;
  version: number;
  status: 'draft' | 'published';
  title: string;
  /** Student-facing role, e.g. "Junior Distribution Sales Representative". */
  studentRole: string;
  mission: string;
  finalOutputTitle: string;
  deadlineHours: number;
  steps: ScenarioStepDefinition[];
};

export type DepartmentDefinition = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Null when the department does not start from an existing product. */
  productKey: string | null;
  projectKey: string;
  projectTitle: string;
  coreQuestion: string;
  finalOutput: string;
  officeZoneKey: string;
  accentColor: string;
  /** Only Sales is playable in this milestone. */
  status: 'playable' | 'coming_soon';
  scenarioKey: string | null;
};
