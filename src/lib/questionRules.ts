/** Questions where 0 is a legitimate answer meaning "none", *in addition* to the configured
 *  minValue–maxValue band. Values between 1 and minValue−1 stay invalid.
 *
 *  Keyed by `questionOrder`; the value is the German label for the zero case, used in both the
 *  input hint and the validation error ("Entweder 0 (keine Einmalzahlung) oder mind. …").
 *
 *  The exemption previously existed for question 19 only, hardcoded separately in the tap path
 *  (VoiceQuestionModal) and the voice path (handleFunctionCall) — which is how question 18 came to
 *  reject 0 in production even though a lump sum is optional. Keeping it in one place means the two
 *  paths cannot disagree again.
 *
 *  The bounds themselves are NOT here: minValue/maxValue live on the Question rows and differ
 *  between environments (dev had 1500–5000 while production ran 1500–10000). Never hardcode them.
 *  See private-documents/after-demo/OPTIONAL_LUMP_SUM_FIX_PLAN.md.
 */
export const ZERO_ALLOWED_QUESTIONS: Record<number, string> = {
  18: "keine Einmalzahlung", // Beabsichtigte Einmalveranlagung — a lump sum is optional
  19: "kein Sparplan",       // Beabsichtigte monatliche Veranlagung — a savings plan is optional
};

/** German zero-case label if this question accepts 0, otherwise undefined. */
export function zeroAllowedLabel(questionOrder?: number): string | undefined {
  return questionOrder === undefined ? undefined : ZERO_ALLOWED_QUESTIONS[questionOrder];
}
