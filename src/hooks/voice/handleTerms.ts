import { TERMS1_EXPLAIN_INSTRUCTIONS, TERMS2_EXPLAIN_INSTRUCTIONS, SUSTAINABILITY_EXPLAIN_INSTRUCTIONS, makeNextTopicMsg, isAskableNow, ADVISOR_PERSONA } from "./prompts";
import type { VoiceContext } from "./voiceContext";

/** Called both from VoiceSessionShell's auto-advance effect (isAISpeaking goes false in Phase 0
 *  intro) AND from the intro screen's skip button — see
 *  private-documents/after-demo/PHASE_0_INTRO_SKIP_PLAN.md. The guard + ref/state flip happen
 *  synchronously, before the fetch, so whichever caller runs first wins and the other bails —
 *  otherwise tapping skip while the AI is mid-intro would race the auto-advance effect (skip's
 *  stopAudio() flips isAISpeaking false, which is exactly what that effect watches for) into
 *  double-sending response.create. */
export async function handleMoveToTerms1(ctx: VoiceContext): Promise<void> {
  const {
    sessionId, termsSubStepRef, langRef, serverResponseActiveRef,
    awaitingResponseCreatedRef, pendingResponseAfterCancelRef,
    setTermsSubStep, saveVoiceState, send,
  } = ctx;
  if (termsSubStepRef.current !== 'intro') return;
  termsSubStepRef.current = 'terms1';
  setTermsSubStep('terms1');

  fetch("/api/phase", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ sessionId, phase: "TERMS1" }),
  }).catch(() => {});
  saveVoiceState(0).catch(() => {});

  const terms1Create = { type: "response.create", response: { instructions: TERMS1_EXPLAIN_INSTRUCTIONS(langRef.current) } };
  // Skip-intro race guard: if the intro response is still alive server-side
  // (generating) or was requested but not yet born, sending this create now
  // collides with it ("conversation_already_has_active_response") — and in the
  // not-yet-born case the intro would then claim activeResponseIdRef and play
  // its self-introduction over the document screen. Park the create instead;
  // wsMessageHandler cancels a late-born intro on response.created and fires
  // the parked create on response.done. See PHASE_0_INTRO_SKIP_RACE_PLAN.md.
  if (serverResponseActiveRef.current || awaitingResponseCreatedRef.current) {
    pendingResponseAfterCancelRef.current = terms1Create;
    return;
  }
  send(terms1Create);
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
  // Phase 1 is push-to-talk only — disable VAD explicitly rather than inheriting whatever state
  // Phase 0's terms screens happened to leave it in. See
  // private-documents/after-demo/PHASE_1_PTT_PLAN.md.
  send({ type: "session.update", session: { type: "realtime", audio: { input: { turn_detection: null } } } });
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
    skippedIdsRef, answeredIdsRef, langRef, fastModeRef, savedAnswersRef,
    setTermsSubStep, setCard, dispatch, send,
  } = ctx;

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
    .filter(q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id) && isAskableNow(q, questionsRef.current, savedAnswersRef.current))
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
    // Fast Mode: context above stays updated so an on-demand PTT question still has it, but
    // skip the auto-narration itself. See private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md.
    // Note: the valid values are deliberately NOT injected into the spoken instructions —
    // the model read them aloud ("bitte antworten Sie mit Ja oder Nein"). Validation still
    // works: the values live in the system prompt's topic list and the context messages.
    if (fastModeRef.current) return;
    send({
      type: "response.create",
      response: {
        instructions: `${ADVISOR_PERSONA(langRef.current)} Der Kunde hat die Nachhaltigkeitsinformationen gelesen und bestätigt. Phase 1 läuft weiter. Rufen Sie NICHT explain_topic auf. Fragen Sie jetzt direkt, ob der Kunde die Nachhaltigkeitsinformationen zur Kenntnis genommen hat. ${qText(q3.text)} Maximal 2 kurze Sätze. Warten Sie auf die Antwort.`,
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
      // Fast Mode: context above stays updated so an on-demand PTT question still has it, but
      // skip the auto-narration itself. See private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md.
      if (fastModeRef.current) return;
      send({
        type: "response.create",
        response: {
          instructions: `${ADVISOR_PERSONA(langRef.current)} Der Kunde hat die Nachhaltigkeitsinformationen bestätigt. Phase 1 läuft weiter. Rufen Sie NICHT explain_topic auf. Stellen Sie direkt die Frage zum nächsten Thema. ${qText(nextQ.text)} Maximal 2 kurze Sätze. Warten Sie auf die Antwort.`,
        },
      });
    }
  }
}
