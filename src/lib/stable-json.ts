/**
 * Deterministic JSON serialisation for change detection.
 *
 * `JSON.stringify` preserves insertion order, but PostgreSQL `jsonb` does not:
 * it normalises object keys on write. So a value read back from the database
 * can serialise differently from an identical value built in memory, and a
 * naive string comparison would report "changed" on every save — inflating
 * answer versions and filling the revision history with phantom revisions.
 *
 * Sorting keys makes the comparison order-insensitive. Array order is
 * preserved, because for repeatable rows the order is real information.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      result[key] = normalize(source[key]);
    }
    return result;
  }
  return value;
}

export function deepEquals(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}
