/**
 * Verifies the deterministic hidden-fact disclosure matcher.
 *
 *   npm run verify:disclosure
 *
 * The discovery mechanic is the product: a student who asks a good question
 * should earn the specific number, and a student who asks nothing in particular
 * should earn nothing. In mock mode this matcher IS the mechanism, so it is
 * checked against ordinary phrasings rather than the exact trigger strings, and
 * against questions that must NOT disclose anything.
 */
import { matchFacts, selectDisclosures } from '@/services/ai/fact-matcher';
import { getPersona } from '@/content/personas.server';

let failures = 0;
const check = (label: string, cond: unknown, detail = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✓' : '✗ FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const buyer = getPersona('sales-quickmart', 'quickmart-buyer');
if (!buyer) throw new Error('quickmart-buyer persona is not registered');

const reveal = (message: string, already: string[] = []) =>
  selectDisclosures(matchFacts(message, buyer.facts, already)).map((f) => f.id);

/** Natural phrasings a student might actually type. */
const SHOULD_REVEAL: Array<[string, string]> = [
  ['morning_velocity', 'How do comparable protein drinks sell in the morning, and how does that differ in office-area stores?'],
  ['morning_velocity', 'What is the current sales velocity for this category?'],
  ['morning_velocity', 'How many units per store per day do the existing protein drinks do?'],
  ['morning_velocity', 'Do office locations perform differently?'],
  ['price_conversion', 'What price point converts best for your shoppers?'],
  ['price_conversion', 'Is there a price ceiling where customers stop buying?'],
  ['price_conversion', 'How much can customers pay for a drink like this?'],
  ['shelf_space', 'How many facings would a new protein drink get?'],
  ['shelf_space', 'What does the shelf space situation look like in the chiller?'],
  ['new_product_waste', 'What waste levels do you see on new products?'],
  ['new_product_waste', 'How do you think about inventory risk here?'],
  ['pilot_preference', 'Would you prefer to start small with a pilot?'],
  ['pilot_preference', 'What test region would you be comfortable with?'],
  ['pilot_preference', 'How many stores would you want in a trial?'],
  ['expansion_threshold', 'What does success look like for you after four weeks?'],
  ['expansion_threshold', 'What would it take to expand this nationwide?'],
  ['expansion_threshold', 'What are the criteria for expansion?'],
  ['morning_velocity', '朝の売上はどれくらいですか？'],
  ['shelf_space', '棚のスペースはどれくらい確保できますか？'],
];

console.log('=== good questions earn the specific fact ===');
for (const [expected, message] of SHOULD_REVEAL) {
  const ids = reveal(message);
  check(`"${message.slice(0, 62)}${message.length > 62 ? '…' : ''}" → ${expected}`, ids.includes(expected), ids.join(', ') || 'nothing');
}

/** Vague or off-topic messages must not leak anything. */
const SHOULD_REVEAL_NOTHING = [
  'Can you tell me more about QuickMart?',
  'Thank you for making time today.',
  'BITE Protein Drink has 20 g of protein and tastes great.',
  'We are excited about this partnership.',
  'Hello, I am the sales representative from BITE.',
  'I think our product would be a great fit for your customers.',
];

console.log('\n=== vague questions earn nothing ===');
for (const message of SHOULD_REVEAL_NOTHING) {
  const ids = reveal(message);
  check(`"${message}" reveals nothing`, ids.length === 0, ids.join(', '));
}

console.log('\n=== disclosure discipline ===');
const greedy = 'Tell me about morning sales velocity, price points, shelf facings, waste, the pilot region and expansion criteria.';
check('at most 2 facts disclosed per turn', reveal(greedy).length <= 2, `${reveal(greedy).length}`);

const already = ['morning_velocity'];
check(
  'an already-revealed fact is never re-disclosed',
  !reveal('What is the morning sales velocity?', already).includes('morning_velocity'),
);

check(
  'specificity wins: a precise question outranks a brushing one',
  reveal('How many facings would a new protein drink get on the shelf?')[0] === 'shelf_space',
  reveal('How many facings would a new protein drink get on the shelf?').join(', '),
);

const allHidden = buyer.facts.filter((f) => f.visibility === 'hidden').map((f) => f.id);
const coverage = new Set(SHOULD_REVEAL.map(([id]) => id));
check('every hidden fact is covered by this test', allHidden.every((id) => coverage.has(id)),
  allHidden.filter((id) => !coverage.has(id)).join(', '));

console.log(`\n${failures === 0 ? '✅ DISCLOSURE MATCHER VERIFIED' : `❌ ${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
