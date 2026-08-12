export const ZERO_ALLOWED_QUESTIONS: Record<number, string> = {
  18: "keine Einmalzahlung", // Beabsichtigte Einmalveranlagung — a lump sum is optional
  19: "kein Sparplan",       // Beabsichtigte monatliche Veranlagung — a savings plan is optional
};

/** German zero-case label if this question accepts 0, otherwise undefined. */
export function zeroAllowedLabel(questionOrder?: number): string | undefined {
  return questionOrder === undefined ? undefined : ZERO_ALLOWED_QUESTIONS[questionOrder];
}

/** questionOrder values the UI and prompts depend on. Verified against prisma/seed.ts. */
export const Q = {
  REASON:              1,  // Anlageziele
  DURATION_YEARS:      2,  // Angedachte Anlagedauer
  PRIOR_EXPERIENCE:   15,  // Erfahrungen mit Vermögensverwaltung (experienced_positive lives here)
  SOURCE_OF_FUNDS:    16,  // Herkunft der Vermögenswerte
  ONE_TIME_INVESTMENT: 18, // Beabsichtigte Einmalveranlagung
  MONTHLY_INVESTMENT:  19, // Beabsichtigte monatliche Veranlagung
} as const;

interface OrderedQuestion { id: string; questionOrder?: number }

export function questionByOrder<T extends OrderedQuestion>(questions: T[], order: number): T | undefined {
  return questions.find(q => q.questionOrder === order);
}

/** The saved answer for a question, located by its order. `undefined` if unanswered. */
export function answerByOrder(
  questions: OrderedQuestion[],
  answers:   Record<string, string>,
  order:     number,
): string | undefined {
  const q = questionByOrder(questions, order);
  return q ? answers[q.id] : undefined;
}

/** A numeric answer located by order. Returns 0 when absent or unparseable — but note the
 *  caller cannot distinguish "answered zero" from "not answered"; use answerByOrder when
 *  that difference matters. */
export function numericAnswerByOrder(
  questions: OrderedQuestion[],
  answers:   Record<string, string>,
  order:     number,
): number {
  return parseFloat(answerByOrder(questions, answers, order) ?? "") || 0;
}
