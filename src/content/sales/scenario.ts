import type { ScenarioVersionDefinition, TaskField } from '@/types/scenario';
import { BITE_UNIT_ECONOMICS } from '@/content/company';
import { MEDIA } from '@/content/media';

/**
 * Sales vertical slice: BITE Protein Drink × QuickMart.
 *
 * This file is pure data. The runtime engine in `services/scenario` knows
 * nothing about Sales — swapping in Marketing/PM/Strategy/HR means adding
 * another definition like this one, not changing the engine.
 */

const DECISION_AFFECTED_OPTIONS = [
  { label: 'Price', value: 'price' },
  { label: 'Store count', value: 'store_count' },
  { label: 'Test region', value: 'test_region' },
  { label: 'Quantity', value: 'quantity' },
  { label: 'Promotion', value: 'promotion' },
  { label: 'Shelf placement', value: 'shelf_placement' },
  { label: 'Reorder rule', value: 'reorder_rule' },
  { label: 'Risk-sharing', value: 'risk_sharing' },
  { label: 'Other', value: 'other' },
];

const e = BITE_UNIT_ECONOMICS;

/** Reference panels. Numbers come from the economics constants, never retyped. */
const PRODUCT_REFERENCE = {
  src: MEDIA.product.src,
  alt: MEDIA.product.alt,
  title: 'BITE Protein Drink',
  caption: '330 ml · 20 g protein · refrigerated · 30-day shelf life',
  facts: [
    { label: 'Recommended retail', value: `¥${e.recommendedRetailPriceYen}` },
    { label: 'Standard wholesale', value: `¥${e.standardWholesalePriceYen}` },
    { label: 'Base contribution', value: `¥${e.baseContributionYen}/unit` },
  ],
};

const ACCOUNT_REFERENCE = {
  src: MEDIA.account.src,
  alt: MEDIA.account.alt,
  title: 'QuickMart',
  caption: 'Japanese convenience store chain · approx. 1,200 stores',
  facts: [
    { label: 'Age 18–29 share', value: '31%' },
    { label: 'Morning sales share', value: '18%' },
    { label: 'Refrigerated waste', value: '4.2%' },
  ],
};

const PROPOSAL_FIELDS: TaskField[] = [
  {
    key: 'test_region',
    label: 'Test region',
    type: 'text',
    required: true,
    placeholder: 'e.g. Kansai, nationwide, Tokyo office districts',
    helpText:
      'The pilot options in the Data Room are decision aids. You may design your own structure.',
  },
  {
    key: 'store_count',
    label: 'Store count',
    type: 'number',
    required: true,
    validation: { min: 1, max: 1200 },
    helpText: 'QuickMart operates approx. 1,200 stores in total.',
  },
  {
    key: 'initial_quantity',
    label: 'Initial quantity (units)',
    type: 'number',
    required: true,
    validation: { min: 0 },
    helpText: "BITE's minimum production run is 2,400 units.",
  },
  {
    key: 'wholesale_price_yen',
    label: 'Wholesale price (¥ / unit)',
    type: 'number',
    required: true,
    validation: { min: 0 },
    calculatorKey: 'deal-economics',
    helpText: 'Standard QuickMart wholesale is ¥178.',
  },
  {
    key: 'retail_price_yen',
    label: 'Retail price (¥ / unit)',
    type: 'number',
    required: true,
    validation: { min: 0 },
    calculatorKey: 'deal-economics',
    helpText: 'Recommended retail price is ¥298.',
  },
  {
    key: 'extra_promotion_yen',
    label: 'Extra promotion support (¥ / unit)',
    type: 'number',
    required: false,
    validation: { min: 0 },
    calculatorKey: 'deal-economics',
    helpText:
      'On top of the ¥12 base promotion already in the cost structure. This is not free — it reduces BITE contribution.',
  },
  {
    key: 'target_customer',
    label: 'Target customer',
    type: 'textarea',
    required: true,
    epistemicKind: 'hypothesis',
  },
  {
    key: 'shelf_or_placement_strategy',
    label: 'Shelf / placement strategy',
    type: 'textarea',
    required: true,
  },
  {
    key: 'promotion_plan',
    label: 'Promotion plan',
    type: 'textarea',
    required: true,
  },
  {
    key: 'bite_support',
    label: 'BITE support',
    type: 'textarea',
    required: true,
    helpText: 'What BITE does to make this work beyond supplying product.',
  },
  {
    key: 'sales_target_units_per_store_per_day',
    label: 'Sales target (units / store / day)',
    type: 'number',
    required: true,
    validation: { min: 0 },
    epistemicKind: 'hypothesis',
  },
  {
    key: 'reorder_or_expansion_rule',
    label: 'Reorder / expansion rule',
    type: 'textarea',
    required: true,
    helpText: 'Under what measured condition does this pilot continue or expand?',
  },
  {
    key: 'expected_volume',
    label: 'Expected volume',
    type: 'textarea',
    required: true,
    epistemicKind: 'hypothesis',
    helpText: 'Show how you got there: stores × units/store/day × days.',
  },
  {
    key: 'quickmart_economics_summary',
    label: 'QuickMart economics summary',
    type: 'textarea',
    required: true,
    helpText: 'What this deal is worth to QuickMart — margin rate and margin amount.',
  },
  {
    key: 'bite_contribution_summary',
    label: 'BITE contribution summary',
    type: 'textarea',
    required: true,
  },
  {
    key: 'customer_value_summary',
    label: 'Customer value summary',
    type: 'textarea',
    required: true,
    helpText: 'Feature → customer benefit → business impact → evidence.',
  },
  { key: 'key_risk', label: 'Key risk', type: 'textarea', required: true },
  {
    key: 'risk_mitigation',
    label: 'Risk mitigation',
    type: 'textarea',
    required: true,
  },
];

const PROPOSAL_GUARDRAILS = [
  'wholesale-floor',
  'contribution-floor',
  'extra-promotion-cap',
  'min-production-run',
  'retail-margin-advisory',
  'retail-price-advisory',
];

export const SALES_SCENARIO: ScenarioVersionDefinition = {
  scenarioKey: 'sales-quickmart',
  version: 1,
  status: 'published',
  title: 'BITE Protein Drink × QuickMart',
  studentRole: 'Junior Distribution Sales Representative',
  mission:
    'Get BITE Protein Drink listed at QuickMart under commercially viable conditions.',
  finalOutputTitle: 'QuickMart Final Sales Proposal',
  deadlineHours: 24,
  steps: [
    // ---------------------------------------------------------------- STEP 0A
    {
      key: 'sales-training',
      title: 'Sales Training',
      stepType: 'training',
      sortOrder: 0,
      estimatedMinutes: 15,
      officeZoneKey: 'sales-zone',
      summary: 'Learn how Sales professionals think before the work begins.',
      instructions:
        'Read the Sales Starter, then mark the training complete. The optional self-check is for you only — it is never used as evidence of skill.',
      unlockRule: { type: 'always' },
      completionRule: { type: 'all_required_tasks' },
      resourceKeys: ['sales-training-1pager'],
      tasks: [
        {
          key: 'training-review',
          title: 'Read the Sales Starter',
          kind: 'acknowledge',
          required: true,
          instructions:
            'Open the Sales Starter in the panel below. When you have read it, mark the training complete.',
          completion: { type: 'acknowledged' },
        },
        {
          key: 'training-self-check',
          title: 'Optional self-check',
          kind: 'form',
          required: false,
          instructions:
            'Not scored, and not used as SKILL FIT evidence. It exists only to let you check your own understanding.',
          completion: { type: 'required_fields' },
          fields: [
            {
              key: 'q_hypothesis',
              label: 'A hypothesis is…',
              type: 'select',
              options: [
                { label: 'A fact you can present to the buyer', value: 'a' },
                { label: 'A preliminary view that still needs validating', value: 'b' },
                { label: 'The same thing as a business goal', value: 'c' },
              ],
            },
            {
              key: 'q_request',
              label: 'A buyer says "your price is too high." The right first move is…',
              type: 'select',
              options: [
                { label: 'Lower the price', value: 'a' },
                { label: 'Find out what is actually behind the objection', value: 'b' },
                { label: 'End the meeting', value: 'c' },
              ],
            },
            {
              key: 'q_deal',
              label: 'A closed deal is…',
              type: 'select',
              options: [
                { label: 'Always a good outcome', value: 'a' },
                { label: 'Only good if it is commercially viable for both sides', value: 'b' },
              ],
            },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- STEP 0B
    {
      key: 'onboarding',
      media: PRODUCT_REFERENCE,
      title: 'Onboarding — Understand BITE and the product',
      stepType: 'briefing',
      sortOrder: 1,
      estimatedMinutes: 15,
      officeZoneKey: 'sales-zone',
      summary: 'Meet your manager and learn what you are actually selling.',
      instructions:
        'Review BITE, the product sheet and the QuickMart overview. Then identify three sales strengths of BITE Protein Drink — with the evidence behind each one, and why it might matter to this specific account.',
      unlockRule: { type: 'step_completed', stepKey: 'sales-training' },
      completionRule: { type: 'all_required_tasks' },
      resourceKeys: [
        'bite-company-profile',
        'bite-protein-drink-sheet',
        'bite-unit-economics',
        'quickmart-account-profile',
      ],
      tasks: [
        {
          key: 'product-strengths',
          title: 'Three sales strengths',
          kind: 'form',
          required: true,
          instructions:
            'A strength is only a strength if it does something for this buyer. "20 g protein" is a feature; what it is worth to QuickMart is the strength.',
          completion: {
            type: 'all',
            rules: [
              { type: 'min_rows', fieldKey: 'strengths', min: 3 },
              { type: 'submitted' },
            ],
          },
          fields: [
            {
              key: 'strengths',
              label: 'Sales strengths',
              type: 'repeatable_group',
              required: true,
              minRows: 3,
              initialRows: 3,
              fields: [
                {
                  key: 'strength',
                  label: 'Strength',
                  type: 'text',
                  required: true,
                  epistemicKind: 'neutral',
                },
                {
                  key: 'evidence',
                  label: 'Evidence',
                  type: 'textarea',
                  required: true,
                  epistemicKind: 'fact',
                  helpText: 'Where does this come from? Name the resource or number.',
                },
                {
                  key: 'why_it_may_matter_to_quickmart',
                  label: 'Why it may matter to QuickMart',
                  type: 'textarea',
                  required: true,
                  epistemicKind: 'hypothesis',
                },
              ],
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------------------- STEP 1
    {
      key: 'account-research',
      media: ACCOUNT_REFERENCE,
      title: 'Account Research',
      stepType: 'research',
      sortOrder: 2,
      estimatedMinutes: 25,
      officeZoneKey: 'data-room',
      summary: 'Build a pre-meeting account hypothesis about QuickMart.',
      instructions:
        'Work in the Data Room. Separate what you can evidence from what you are guessing — the meeting exists to test the guesses.',
      unlockRule: { type: 'step_completed', stepKey: 'onboarding' },
      completionRule: { type: 'all_required_tasks' },
      resourceKeys: [
        'quickmart-account-profile',
        'quickmart-category-data',
        'competitor-comparison',
      ],
      tasks: [
        {
          key: 'account-analysis-memo',
          title: 'Account Analysis Memo',
          kind: 'form',
          required: true,
          instructions:
            'A hypothesis is not a fact. Fields marked as hypothesis are your interpretation and will be tested in the meeting.',
          completion: {
            type: 'all',
            rules: [
              { type: 'min_rows', fieldKey: 'business_goals', min: 3 },
              { type: 'min_rows', fieldKey: 'likely_problems', min: 3 },
              { type: 'submitted' },
            ],
          },
          fields: [
            {
              key: 'business_goals',
              label: 'Business goals (3)',
              type: 'repeatable_group',
              required: true,
              minRows: 3,
              initialRows: 3,
              helpText: 'What is QuickMart ultimately trying to achieve?',
              fields: [
                { key: 'goal', label: 'Goal', type: 'text', required: true },
                {
                  key: 'evidence',
                  label: 'Evidence',
                  type: 'textarea',
                  required: true,
                  epistemicKind: 'fact',
                },
              ],
            },
            {
              key: 'likely_problems',
              label: 'Likely problems (3)',
              type: 'repeatable_group',
              required: true,
              minRows: 3,
              initialRows: 3,
              helpText: 'What is blocking those goals?',
              fields: [
                {
                  key: 'problem_hypothesis',
                  label: 'Problem hypothesis',
                  type: 'text',
                  required: true,
                  epistemicKind: 'hypothesis',
                },
                {
                  key: 'evidence',
                  label: 'Evidence',
                  type: 'textarea',
                  required: true,
                  epistemicKind: 'fact',
                },
                {
                  key: 'why_it_matters',
                  label: 'Why it matters',
                  type: 'textarea',
                  required: true,
                  epistemicKind: 'hypothesis',
                },
              ],
            },
            {
              key: 'top_account_hypothesis',
              label: 'Top account hypothesis (optional)',
              type: 'textarea',
              required: false,
              epistemicKind: 'hypothesis',
            },
            {
              key: 'what_must_be_validated_in_meeting',
              label: 'What must be validated in the meeting (optional)',
              type: 'textarea',
              required: false,
              epistemicKind: 'hypothesis',
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------------------- STEP 2
    {
      key: 'meeting-prep',
      title: 'Buyer Meeting Preparation',
      stepType: 'decision',
      sortOrder: 3,
      estimatedMinutes: 20,
      officeZoneKey: 'my-desk',
      summary: 'Write questions that can actually change your proposal.',
      instructions:
        'Prepare five questions for Yuki Tanaka. For each one, state the purpose and which decision the answer would change. If an answer cannot change any decision, it is small talk.',
      unlockRule: { type: 'step_completed', stepKey: 'account-research' },
      completionRule: { type: 'all_required_tasks' },
      tasks: [
        {
          key: 'buyer-questions',
          title: 'Five buyer questions',
          kind: 'form',
          required: true,
          referenceTaskKeys: ['account-analysis-memo'],
          completion: {
            type: 'all',
            rules: [
              { type: 'min_rows', fieldKey: 'questions', min: 5 },
              { type: 'submitted' },
            ],
          },
          fields: [
            {
              key: 'questions',
              label: 'Questions',
              type: 'repeatable_group',
              required: true,
              minRows: 5,
              initialRows: 5,
              maxRows: 12,
              fields: [
                {
                  key: 'question',
                  label: 'Question',
                  type: 'textarea',
                  required: true,
                },
                { key: 'purpose', label: 'Purpose', type: 'text', required: true },
                {
                  key: 'decision_affected',
                  label: 'Decision affected',
                  type: 'select',
                  required: true,
                  options: DECISION_AFFECTED_OPTIONS,
                },
              ],
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------------------- STEP 3
    {
      key: 'buyer-meeting',
      media: ACCOUNT_REFERENCE,
      title: 'AI Buyer Meeting',
      stepType: 'ai_interaction',
      sortOrder: 4,
      estimatedMinutes: 30,
      officeZoneKey: 'meeting-room-a',
      summary: 'Meet Yuki Tanaka, Beverage Category Buyer at QuickMart.',
      instructions:
        'Yuki will not volunteer everything she knows. Specific numbers come out when you ask about the thing they describe. Your prepared questions are visible beside the conversation — but follow what she actually says.',
      unlockRule: { type: 'step_completed', stepKey: 'meeting-prep' },
      completionRule: { type: 'all_required_tasks' },
      tasks: [
        {
          key: 'buyer-meeting-conversation',
          title: 'Meeting with Yuki Tanaka',
          kind: 'ai_conversation',
          required: true,
          personaKey: 'quickmart-buyer',
          referenceTaskKeys: ['buyer-questions', 'account-analysis-memo'],
          completion: {
            type: 'conversation_ended',
            personaKey: 'quickmart-buyer',
            minStudentMessages: 5,
          },
        },
      ],
    },

    // ----------------------------------------------------------------- STEP 4
    {
      key: 'needs-analysis',
      title: 'Needs Analysis',
      stepType: 'analysis',
      sortOrder: 5,
      estimatedMinutes: 20,
      officeZoneKey: 'my-desk',
      summary: 'Turn the conversation into a structured customer diagnosis.',
      instructions:
        'What QuickMart wants → what blocks it → what it needs → what constrains the decision → what risk it fears. A stated request is not automatically the real need.',
      unlockRule: {
        type: 'conversation_completed',
        personaKey: 'quickmart-buyer',
        stepKey: 'buyer-meeting',
      },
      completionRule: { type: 'all_required_tasks' },
      tasks: [
        {
          key: 'needs-analysis',
          title: 'Customer diagnosis',
          kind: 'form',
          required: true,
          referenceTaskKeys: ['account-analysis-memo'],
          completion: {
            type: 'all',
            rules: [{ type: 'required_fields' }, { type: 'submitted' }],
          },
          fields: [
            {
              key: 'goal',
              label: 'Goal — what QuickMart wants',
              type: 'textarea',
              required: true,
            },
            {
              key: 'problem',
              label: 'Problem — what blocks it',
              type: 'textarea',
              required: true,
            },
            {
              key: 'need',
              label: 'Need — what it needs to solve that',
              type: 'textarea',
              required: true,
            },
            {
              key: 'constraint',
              label: 'Constraint — what is hard to change',
              type: 'textarea',
              required: true,
            },
            {
              key: 'risk',
              label: 'Risk — what it fears going wrong',
              type: 'textarea',
              required: true,
            },
            { key: 'top_need_1', label: 'Top need #1', type: 'text', required: true },
            {
              key: 'top_need_2',
              label: 'Top need #2 (optional)',
              type: 'text',
              required: false,
            },
            {
              key: 'evidence_summary',
              label: 'Evidence summary',
              type: 'textarea',
              required: true,
              epistemicKind: 'fact',
              helpText: 'What did you actually hear or read that supports this?',
            },
            {
              key: 'evidence_refs',
              label: 'Link your evidence',
              type: 'resource_evidence',
              required: false,
              helpText:
                'Select the Data Room resources and buyer statements this diagnosis rests on.',
              evidenceSources: [
                { kind: 'resources' },
                {
                  kind: 'conversation',
                  personaKey: 'quickmart-buyer',
                  stepKey: 'buyer-meeting',
                },
              ],
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------------------- STEP 5
    {
      key: 'proposal-v1',
      media: PRODUCT_REFERENCE,
      title: 'Initial Sales Proposal',
      stepType: 'decision',
      sortOrder: 6,
      estimatedMinutes: 35,
      officeZoneKey: 'my-desk',
      summary: 'Design a commercially viable pilot proposal.',
      instructions:
        'The calculators show you the economics; they do not decide for you. Guardrail warnings are warnings — the proposal is still yours to make.',
      unlockRule: { type: 'step_completed', stepKey: 'needs-analysis' },
      completionRule: { type: 'all_required_tasks' },
      resourceKeys: [
        'pilot-structure-options',
        'bite-unit-economics',
        'bite-sales-guardrails',
        'competitor-comparison',
      ],
      tasks: [
        {
          key: 'proposal-v1',
          title: 'Proposal v1',
          kind: 'form',
          required: true,
          referenceTaskKeys: ['needs-analysis'],
          guardrailKeys: PROPOSAL_GUARDRAILS,
          completion: {
            type: 'all',
            rules: [{ type: 'required_fields' }, { type: 'submitted' }],
          },
          fields: PROPOSAL_FIELDS,
        },
      ],
    },

    // ----------------------------------------------------------------- STEP 6
    {
      key: 'unexpected-event',
      title: 'Unexpected Event',
      stepType: 'unexpected_event',
      sortOrder: 7,
      estimatedMinutes: 20,
      officeZoneKey: 'notification-area',
      summary: 'New information has arrived. Decide what changes and what holds.',
      instructions:
        'Price is one variable among many. Decide deliberately what to change and what to keep — and be able to say why for both.',
      unlockRule: { type: 'task_submitted', taskKey: 'proposal-v1' },
      completionRule: { type: 'all_required_tasks' },
      eventPayload: {
        headline: 'QuickMart: competitor pricing and rollout risk',
        from: 'Yuki Tanaka — Beverage Category Buyer, QuickMart',
        body: 'Two things have changed since your proposal.\n\nFirst, FitDrink has come back to us with a wholesale price ¥20 below yours. Second, internally we are not comfortable with a nationwide rollout for a brand with low awareness — that feels like too much risk for us to carry.\n\nI would like to see how you want to respond before we go further.',
        facts: [
          { label: 'Competitor', value: 'FitDrink' },
          { label: 'Competitor wholesale gap', value: '¥20 lower than BITE' },
          { label: 'Stated concern', value: 'Nationwide rollout is too risky for a low-awareness brand' },
        ],
      },
      tasks: [
        {
          key: 'event-acknowledge',
          title: 'Read the message',
          kind: 'acknowledge',
          required: true,
          completion: { type: 'acknowledged' },
        },
        {
          key: 'proposal-v2-revision',
          title: 'Revision decision',
          kind: 'form',
          required: true,
          referenceTaskKeys: ['proposal-v1', 'needs-analysis'],
          instructions:
            'Proposal v1 is preserved and shown beside this form. Nothing here overwrites it.',
          completion: {
            type: 'all',
            rules: [{ type: 'required_fields' }, { type: 'submitted' }],
          },
          fields: [
            {
              key: 'conditions_to_change',
              label: 'Conditions to change',
              type: 'textarea',
              required: true,
            },
            {
              key: 'conditions_to_keep',
              label: 'Conditions to keep',
              type: 'textarea',
              required: true,
            },
            { key: 'why_change', label: 'Why change', type: 'textarea', required: true },
            { key: 'why_keep', label: 'Why keep', type: 'textarea', required: true },
            {
              key: 'response_to_competitor',
              label: 'Response to the competitor',
              type: 'textarea',
              required: true,
              helpText:
                'Matching on price is one option among several. It is not required.',
            },
            {
              key: 'how_to_reduce_quickmart_risk',
              label: "How to reduce QuickMart's risk",
              type: 'textarea',
              required: true,
            },
            {
              key: 'proposal_v2_summary',
              label: 'Proposal v2 summary',
              type: 'textarea',
              required: true,
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------------------- STEP 7
    {
      key: 'negotiation',
      media: PRODUCT_REFERENCE,
      title: 'Final Negotiation',
      stepType: 'ai_interaction',
      sortOrder: 8,
      estimatedMinutes: 30,
      officeZoneKey: 'meeting-room-a',
      summary: 'Negotiate the final package with Yuki Tanaka.',
      instructions:
        'Everything is on the table: price, quantity, stores, promotion, sampling, data sharing, return terms, reorder conditions and payment terms. Record the package you actually agreed — BITE will check it against the guardrails.',
      unlockRule: { type: 'step_completed', stepKey: 'unexpected-event' },
      completionRule: { type: 'all_required_tasks' },
      resourceKeys: ['bite-sales-guardrails', 'bite-unit-economics'],
      tasks: [
        {
          key: 'negotiation-conversation',
          title: 'Negotiation with Yuki Tanaka',
          kind: 'ai_conversation',
          required: true,
          personaKey: 'quickmart-buyer',
          referenceTaskKeys: ['proposal-v2-revision'],
          completion: {
            type: 'conversation_ended',
            personaKey: 'quickmart-buyer',
            minStudentMessages: 4,
          },
        },
        {
          key: 'final-agreed-package',
          title: 'Final agreed package',
          kind: 'form',
          required: true,
          guardrailKeys: PROPOSAL_GUARDRAILS.concat('payment-terms'),
          instructions:
            'Record the terms you and Yuki actually landed on. This is structured data, not prose — it is what BITE reviews.',
          completion: {
            type: 'all',
            rules: [{ type: 'required_fields' }, { type: 'submitted' }],
          },
          fields: [
            {
              key: 'wholesale_price_yen',
              label: 'Wholesale price (¥ / unit)',
              type: 'number',
              required: true,
              calculatorKey: 'deal-economics',
              prefillTemplate: '{{proposal-v1.wholesale_price_yen}}',
            },
            {
              key: 'retail_price_yen',
              label: 'Retail price (¥ / unit)',
              type: 'number',
              required: true,
              calculatorKey: 'deal-economics',
              prefillTemplate: '{{proposal-v1.retail_price_yen}}',
            },
            {
              key: 'extra_promotion_yen',
              label: 'Extra promotion support (¥ / unit)',
              type: 'number',
              required: false,
              calculatorKey: 'deal-economics',
              prefillTemplate: '{{proposal-v1.extra_promotion_yen}}',
            },
            {
              key: 'test_region',
              label: 'Test region',
              type: 'text',
              required: true,
              prefillTemplate: '{{proposal-v1.test_region}}',
            },
            {
              key: 'store_count',
              label: 'Store count',
              type: 'number',
              required: true,
              prefillTemplate: '{{proposal-v1.store_count}}',
            },
            {
              key: 'initial_quantity',
              label: 'Initial quantity (units)',
              type: 'number',
              required: true,
              prefillTemplate: '{{proposal-v1.initial_quantity}}',
            },
            {
              key: 'promotion_terms',
              label: 'Promotion terms',
              type: 'textarea',
              required: true,
            },
            {
              key: 'sampling',
              label: 'Sampling',
              type: 'textarea',
              required: false,
            },
            {
              key: 'data_sharing',
              label: 'Data sharing',
              type: 'textarea',
              required: false,
            },
            {
              key: 'return_terms',
              label: 'Unsold product / return terms',
              type: 'textarea',
              required: true,
              helpText: 'BITE cannot offer a full return guarantee.',
            },
            {
              key: 'reorder_conditions',
              label: 'Reorder / expansion conditions',
              type: 'textarea',
              required: true,
            },
            {
              key: 'payment_terms_days',
              label: 'Payment terms (days)',
              type: 'number',
              required: true,
              validation: { min: 0 },
              helpText: 'BITE can accept up to 45 days.',
            },
            {
              key: 'agreement_status',
              label: 'Where the negotiation landed',
              type: 'select',
              required: true,
              options: [
                { label: 'Agreed in principle', value: 'agreed' },
                { label: 'Agreed with open points', value: 'agreed_with_open_points' },
                { label: 'Not agreed — proposal to be revised', value: 'not_agreed' },
              ],
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------------------- STEP 8
    {
      key: 'final-submission',
      title: 'Final Submission',
      stepType: 'final_submission',
      sortOrder: 9,
      estimatedMinutes: 20,
      officeZoneKey: 'executive-room',
      summary: 'Hand over the QuickMart Final Sales Proposal.',
      instructions:
        'Sections are pre-filled from your own earlier work. Edit the wording freely — submitting stores an immutable snapshot.',
      unlockRule: { type: 'step_completed', stepKey: 'negotiation' },
      completionRule: { type: 'all_required_tasks' },
      tasks: [
        {
          key: 'final-proposal',
          title: 'QuickMart Final Sales Proposal',
          kind: 'final_submission',
          required: true,
          referenceTaskKeys: [
            'needs-analysis',
            'proposal-v1',
            'proposal-v2-revision',
            'final-agreed-package',
          ],
          completion: { type: 'submitted' },
          fields: [
            {
              key: 'quickmart_needs',
              label: '1. QuickMart Needs',
              type: 'textarea',
              required: true,
              prefillTemplate:
                'Goal: {{needs-analysis.goal}}\nProblem: {{needs-analysis.problem}}\nNeed: {{needs-analysis.need}}\nTop need: {{needs-analysis.top_need_1}}',
            },
            {
              key: 'bite_value_proposition',
              label: '2. BITE Value Proposition',
              type: 'textarea',
              required: true,
              prefillTemplate: '{{proposal-v1.customer_value_summary}}',
            },
            {
              key: 'pilot_structure',
              label: '3. Pilot / Test Structure',
              type: 'textarea',
              required: true,
              prefillTemplate:
                'Region: {{final-agreed-package.test_region}}\nStores: {{final-agreed-package.store_count}}\nReorder / expansion: {{final-agreed-package.reorder_conditions}}',
            },
            {
              key: 'price_and_quantity',
              label: '4. Wholesale Price / Retail Price / Quantity',
              type: 'textarea',
              required: true,
              prefillTemplate:
                'Wholesale: ¥{{final-agreed-package.wholesale_price_yen}}\nRetail: ¥{{final-agreed-package.retail_price_yen}}\nInitial quantity: {{final-agreed-package.initial_quantity}} units',
            },
            {
              key: 'expected_sales_and_economics',
              label: '5. Expected Sales and Economics',
              type: 'textarea',
              required: true,
              prefillTemplate:
                '{{proposal-v1.expected_volume}}\n\nQuickMart: {{proposal-v1.quickmart_economics_summary}}\nBITE: {{proposal-v1.bite_contribution_summary}}',
            },
            {
              key: 'promotion_and_support',
              label: '6. Promotion and BITE Support',
              type: 'textarea',
              required: true,
              prefillTemplate:
                '{{final-agreed-package.promotion_terms}}\n\nBITE support: {{proposal-v1.bite_support}}',
            },
            {
              key: 'final_negotiated_conditions',
              label: '7. Final Negotiated Conditions',
              type: 'textarea',
              required: true,
              prefillTemplate:
                'Returns: {{final-agreed-package.return_terms}}\nPayment terms: {{final-agreed-package.payment_terms_days}} days\nData sharing: {{final-agreed-package.data_sharing}}\nSampling: {{final-agreed-package.sampling}}',
            },
            {
              key: 'competitive_differentiation',
              label: '8. Competitive Differentiation',
              type: 'textarea',
              required: true,
              prefillTemplate: '{{proposal-v2-revision.response_to_competitor}}',
            },
            {
              key: 'key_risks_and_response',
              label: '9. Key Risks and Response',
              type: 'textarea',
              required: true,
              prefillTemplate:
                'Key risk: {{proposal-v1.key_risk}}\nMitigation: {{proposal-v1.risk_mitigation}}\nReducing QuickMart risk: {{proposal-v2-revision.how_to_reduce_quickmart_risk}}',
            },
            {
              key: 'next_action',
              label: '10. Next Action',
              type: 'textarea',
              required: true,
            },
          ],
        },
      ],
    },
  ],
};
