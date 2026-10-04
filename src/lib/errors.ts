/**
 * An intentional rejection, not a bug.
 *
 * Thrown when the engine's own rules say no — writing into a step that is still
 * locked, starting a department that has no scenario, reopening a conversation
 * that has ended. These are normal outcomes of a student clicking around, so
 * they are reported to the client as a 400 and logged as a single line rather
 * than a stack trace. Anything that is NOT one of these is an actual fault and
 * keeps its full trace.
 */
export class ScenarioRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioRuleError';
  }
}
