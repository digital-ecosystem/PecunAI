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
  PREVIOUS_DECISIONS: 17,  // Wie hat der Auftraggeber bisherige Anlageentscheidungen getroffen?
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

// ── The two amount questions are a pair ──────────────────────────────────────
// Each is individually optional (ZERO_ALLOWED_QUESTIONS above), but BOTH at zero is an
// investment of nothing — the customer would reach Phase 4 with an empty cost table and sign
// a contract for no money. Client decision 2026-08-13: one of the two must be above zero.
//
// Enforced where the amount is entered rather than at the Phase 4 confirmation: by then the
// customer is four phases past the mistake and the only remedy is a disabled button and a
// long walk back. Here the rule is simply "this question is not optional any more".
//
// Order matters, and this handles both directions. Q18 is asked first, so when it is answered
// its partner is still unanswered — 0 stays acceptable, because Q19 can still carry the
// investment. By the time Q19 is asked, Q18 is on record: if it was 0, Q19 must be above zero.
// On a revisit the same test blocks whichever one is edited down to 0 last.
const AMOUNT_PARTNER: Record<number, number> = {
  [Q.ONE_TIME_INVESTMENT]: Q.MONTHLY_INVESTMENT,
  [Q.MONTHLY_INVESTMENT]:  Q.ONE_TIME_INVESTMENT,
};


const ZERO_BLOCKED_REASON: Record<number, string> = {
  [Q.ONE_TIME_INVESTMENT]: "Sie haben keinen monatlichen Sparplan gewählt — bitte geben Sie hier einen Einmalbetrag an.",
  [Q.MONTHLY_INVESTMENT]:  "Sie haben keine Einmalzahlung angegeben — bitte geben Sie hier einen monatlichen Betrag an.",
};

/**
 * Reason why 0 is not acceptable for this amount question right now, or undefined when 0 is
 * still fine. Truthy only for Q18/Q19, and only once the partner amount is on record as 0.
 */
export function zeroBlockedReason(
  questionOrder: number | undefined,
  questions:     OrderedQuestion[],
  answers:       Record<string, string>,
): string | undefined {
  if (questionOrder === undefined) return undefined;
  const partnerOrder = AMOUNT_PARTNER[questionOrder];
  if (partnerOrder === undefined) return undefined;

  
  const partner = answerByOrder(questions, answers, partnerOrder);
  if (partner === undefined || partner.trim() === "") return undefined;

  return (parseFloat(partner) || 0) > 0 ? undefined : ZERO_BLOCKED_REASON[questionOrder];
}
