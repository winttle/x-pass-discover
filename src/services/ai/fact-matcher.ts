import type { PersonaFact } from '@/types/persona';

/**
 * Deterministic disclosure matcher.
 *
 * This is the FLOOR, not the whole mechanism: in OpenAI mode the model also
 * reasons about relevance and its choices are unioned with these matches, then
 * validated against the allowed set. But in mock mode this IS the mechanism, so
 * it has to tolerate ordinary phrasing rather than demand an exact phrase:
 *
 *  - punctuation is flattened, so "office-area stores" matches the topic
 *    "office area";
 *  - a multi-word topic matches when all of its words are present anywhere in
 *    the question, so "how do they sell in the morning?" matches "morning
 *    sales" without the student having to guess the exact wording;
 *  - topics written in Japanese (no word boundaries) fall back to substring
 *    matching.
 *
 * Specificity still wins: a topic contributes its word count to the score, so a
 * question that hits a precise topic outranks one that brushes a generic one.
 */

/** Lowercase, strip punctuation, keep letters/digits (including CJK). */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const isCjk = (text: string) => /[぀-ヿ㐀-鿿]/.test(text);

function topicScore(topic: string, message: string, messageTokens: Set<string>): number {
  const normalizedTopic = normalize(topic);
  if (normalizedTopic.length === 0) return 0;

  // Japanese topics have no spaces to tokenise on.
  if (isCjk(normalizedTopic)) {
    return message.includes(normalizedTopic) ? normalizedTopic.length / 2 : 0;
  }

  const tokens = normalizedTopic.split(' ').filter(Boolean);
  if (tokens.length === 0) return 0;
  return tokens.every((token) => messageTokens.has(token)) ? tokens.length : 0;
}

export type FactMatch = { fact: PersonaFact; score: number };

export function matchFacts(
  message: string,
  facts: PersonaFact[],
  alreadyRevealedIds: string[],
): FactMatch[] {
  const haystack = normalize(message);
  if (haystack.length === 0) return [];

  const tokens = new Set(haystack.split(' ').filter(Boolean));
  const revealed = new Set(alreadyRevealedIds);

  return facts
    .filter((fact) => fact.visibility === 'hidden' && !revealed.has(fact.id))
    .map((fact) => ({
      fact,
      score: fact.triggerTopics.reduce(
        (total, topic) => total + topicScore(topic, haystack, tokens),
        0,
      ),
    }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * At most two facts per turn: a buyer answers the question asked and leaves
 * room for a follow-up, rather than dumping the scenario.
 */
export function selectDisclosures(matches: FactMatch[], limit = 2): PersonaFact[] {
  return matches.slice(0, limit).map((m) => m.fact);
}

export { normalize as normalizeForMatching };
