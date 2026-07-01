import { TERMS1_EXPLAIN_INSTRUCTIONS, TERMS2_EXPLAIN_INSTRUCTIONS, SUSTAINABILITY_EXPLAIN_INSTRUCTIONS, makeNextTopicMsg } from "./prompts";
import type { VoiceContext } from "./voiceContext";

/** Called from VoiceSessionShell when intro speech ends (isAISpeaking goes false in Phase 0 intro) */
export async function handleMoveToTerms1(ctx: VoiceContext): Promise<void> {
  const { sessionId, termsSubStepRef, langRef, setTermsSubStep, saveVoiceState, send } = ctx;

  await fetch("/api/phase", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ sessionId, phase: "TERMS1" }),
  });
  termsSubStepRef.current = 'terms1';
  setTermsSubStep('terms1');
  saveVoiceState(0).catch(() => {});
  send({ type: "response.create", response: { instructions: TERMS1_EXPLAIN_INSTRUCTIONS(langRef.current) } });
}

/** Customer tapped "Ich bestätige" on the 4money (terms1) document */
export async function handleConfirmTerms1(ctx: VoiceContext): Promise<void> {
  const { sessionId, termsSubStepRef, langRef, setTermsSubStep, saveVoiceState, send } = ctx;

  await fetch("/api/phase", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ sessionId, phase: "TERMS_FROOTS" }),
  });
  termsSubStepRef.current = 'terms2';
  setTermsSubStep('terms2');
  saveVoiceState(0).catch(() => {});
  send({ type: "response.create", response: { instructions: TERMS2_EXPLAIN_INSTRUCTIONS(langRef.current) } });
}

/** Customer tapped "Ich bestätige" on the froots (terms2) document — transitions to Phase 1 */
export async function handleConfirmTerms2(ctx: VoiceContext): Promise<void> {
  const { sessionId, voicePhaseRef, termsSubStepRef, setTermsSubStep, setVoicePhase, saveVoiceState, send } = ctx;

  await fetch("/api/phase", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ sessionId, phase: "QUESTIONS1" }),
  });
  voicePhaseRef.current   = 1;
  termsSubStepRef.current = null;
  setTermsSubStep(null);
  setVoicePhase(1);
  saveVoiceState(0).catch(() => {});
  send({
    type: "conversation.item.create",
    item: {
      type:    "message",
      role:    "user",
      content: [{ type: "input_text", text: "[SYSTEM: Terms confirmed. Starting Phase 1 — risk profile questions. Begin with the first topic.]" }],
    },
  });
  send({ type: "response.create" });
}

/** Customer tapped "Verstanden" on the sustainability disclosure — dismisses modal and advances. */
export async function handleConfirmSustainabilityTerms(ctx: VoiceContext): Promise<void> {
  const {
    termsSubStepRef, sustainabilityConfirmedRef, sessionId, questionsRef,
    skippedIdsRef, answeredIdsRef, langRef,
    setTermsSubStep, setCard, dispatch, send,
  } = ctx;

  const langTag = () => langRef.current === "de"
    ? `Sprechen Sie Deutsch mit formeller Anrede „Sie".`
    : `English only.`;
  const qText = (text: string) => langRef.current === "de"
    ? `Fragen Sie nach dem Thema auf Deutsch — formulieren Sie es gesprächig, lesen Sie nicht wörtlich vor: „${text}".`
    : `Translate this German question to English — conversational phrasing, not like a questionnaire: "${text}".`;

  setTermsSubStep(null);
  termsSubStepRef.current = null;

  // Mark as confirmed so the modal is never shown again this session.
  sustainabilityConfirmedRef.current = true;
  try { localStorage.setItem(`pecunai_sus_${sessionId}`, "1"); } catch {}

  // If Q2 was skipped (not answered), promote it to answered so it doesn't appear in circle-back.
  const q2 = questionsRef.current.find(q => q.questionOrder === 2);
  if (q2 && skippedIdsRef.current.has(q2.id)) {
    skippedIdsRef.current.delete(q2.id);
    answeredIdsRef.current.add(q2.id);
  }

  const q3 = questionsRef.current.find(q => q.questionOrder === 3);
  // Recompute remaining after the Q2 skipped→answered promotion above.
  const remaining = questionsRef.current
    .filter(q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id))
    .map(q => q.id);

  // Resume SYSTEM message — counters the "PHASE 1 PAUSED" entry still in history and
  // prevents the AI from calling explain_topic because ESG was just discussed.
  send({
    type: "conversation.item.create",
    item: { type: "message", role: "user", content: [{ type: "input_text",
      text: "[SYSTEM: Customer confirmed the sustainability disclosure. PHASE 1 RESUMED. Do NOT call explain_topic — ask the next question directly without opening any overlay.]",
    }]},
  });

  if (q3 && !answeredIdsRef.current.has(q3.id)) {
    // Normal first-time flow: Q3 not yet answered — navigate to Q3 and ask it.
    const q3Idx = questionsRef.current.findIndex(q => q.id === q3.id);
    if (q3Idx >= 0) dispatch({ type: "SET_INDEX", index: q3Idx });
    setCard(q3.id);
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: makeNextTopicMsg(q3, remaining.slice(1), false),
      }]},
    });
    const q3Options = q3.options?.length
      ? ` Valid values the customer must choose from: ${q3.options.map(o => `"${o.value ?? o.label}"`).join(", ")}.`
      : "";
    send({
      type: "response.create",
      response: {
        instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat die Nachhaltigkeitsinformationen gelesen und bestätigt. Phase 1 läuft weiter. Rufen Sie NICHT explain_topic auf. Fragen Sie jetzt direkt, ob der Kunde die Nachhaltigkeitsinformationen zur Kenntnis genommen hat. ${qText(q3.text)}${q3Options} Maximal 2 Sätze. Warten Sie auf die Antwort.`,
      },
    });
  } else {
    // Q3 is already answered (e.g. sustainability was shown during circle-back).
    // Navigate to the actual next remaining question instead of looping back to Q3.
    const nextId = remaining[0] ?? null;
    const nextQ  = nextId ? questionsRef.current.find(q => q.id === nextId) : null;
    if (nextQ) {
      const nextQIdx = questionsRef.current.findIndex(q => q.id === nextQ.id);
      if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
      setCard(nextQ.id);
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: makeNextTopicMsg(nextQ, remaining.slice(1), false),
        }]},
      });
      send({
        type: "response.create",
        response: {
          instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat die Nachhaltigkeitsinformationen bestätigt. Phase 1 läuft weiter. Rufen Sie NICHT explain_topic auf. Leiten Sie natürlich zum nächsten Thema über. ${qText(nextQ.text)} Maximal 2 Sätze. Warten Sie auf die Antwort.`,
        },
      });
    }
  }
}
