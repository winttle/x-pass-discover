/** Public (client-safe) AI types. Hidden persona data never appears here. */

export type PublicPersona = {
  key: string;
  name: string;
  role: string;
  organization: string;
  /** Context the student is allowed to see before/while talking. */
  visibleContext: string;
  avatarColor: string;
  portrait: string;
};

export type ChatMessageView = {
  id: string;
  role: 'student' | 'persona';
  content: string;
  createdAt: string;
  /** Short labels for facts newly surfaced by this reply — never the hidden set. */
  revealedFactLabels?: string[];
};

export type ConversationView = {
  id: string;
  personaKey: string;
  status: 'open' | 'ended';
  messages: ChatMessageView[];
  studentMessageCount: number;
  /** How many distinct hidden facts the student has uncovered so far. */
  discoveredFactCount: number;
  totalDiscoverableFactCount: number;
};
