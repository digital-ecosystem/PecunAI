import { TERMS1_EXPLAIN_INSTRUCTIONS, TERMS2_EXPLAIN_INSTRUCTIONS, SUSTAINABILITY_EXPLAIN_INSTRUCTIONS, FAST_MODE_INTRO_INSTRUCTIONS, makeNextTopicMsg, isAskableNow, ADVISOR_PERSONA } from "./prompts";
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
    sessionId, termsSubStepRef, langRef, serverResponseActiveRef, sessionConfiguredRef,
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

  // Skip tapped before the session finished configuring (session.updated hasn't fired, so the
  // intro create was never sent). Don't send the terms1 create now — it would collide with the
  // intro create that session.updated is about to fire ("conversation_already_has_active_-
  // response"). We've flipped termsSubStep to 'terms1' above; session.updated sees that and
  // sends the terms1 narration itself. See PHASE_0_INTRO_SKIP_RACE_PLAN.md.
  if (!sessionConfiguredRef.current) return;

  const terms1Create = { type: "response.create", response: { instructions: TERMS1_EXPLAIN_INSTRUCTIONS(langRef.current) } };
  // Skip-intro race guard: if the intro response is still alive server-side
  // (generating) or was requested but not yet born, sending this create now
  // collides with it ("conversation_already_has_active_response") — and in the
  // not-yet-born case the intro would then claim activeResponseIdRef and play
  // its self-introduction over the document screen. Park the create instead;
  // wsMessageHandler cancels a late-born intro on response.created and fires
  // the parked create on response.done. See PHASE_0_INTRO_SKIP_RACE_PLAN.md.
  if (serverResponseActiveRef.current || awaitingResponseCreatedRef.current) {
    // The intro is cancelled mid-flight, so a half-spoken "Hallo, ich bin Digital Onboarding Guide…" stays in
    // the conversation as the last assistant turn. Left alone, the model finishes/repeats that
    // introduction on the terms1 screen instead of describing the document. Prepend a skip
    // marker — wsMessageHandler fires the whole array on response.done, so it lands AFTER the
    // cancelled intro item and BEFORE the terms1 narration. The tail-playback path below needs
    // no marker: there the intro finished cleanly and the model already moves on.
    pendingResponseAfterCancelRef.current = [
      { type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text",
        text: '[SYSTEM: The customer tapped "skip" during your self-introduction. Do NOT greet, introduce yourself, state your name, or continue that introduction. Speak ONLY about the first document now.]',
      }] } },
      terms1Create,
    ];
    return;
  }
  send(terms1Create);
}

/** Customer tapped "Ich bestätige" on the 4money (terms1) document.
 *
 *  Confirm is reachable at ANY point, including one sentence into the narration. The shell calls
 *  stopAudio() first, which handles the local half (buffered audio dropped, activeResponseIdRef
 *  nulled so late deltas are rejected) — everything below handles the server half, mirroring
 *  handleMoveToTerms1. See private-documents/after-demo/TERMS_EARLY_CONFIRM_FIX_PLAN.md. */
export async function handleConfirmTerms1(ctx: VoiceContext): Promise<void> {
  const {
    sessionId, termsSubStepRef, langRef, serverResponseActiveRef, awaitingResponseCreatedRef,
    pendingResponseAfterCancelRef, setTermsSubStep, saveVoiceState, send,
  } = ctx;
  // Guard + flip synchronously, before any await — a double-tap must not run this twice, and the
  // checks below have to read the response state as it is NOW, not after a network round trip.
  if (termsSubStepRef.current !== 'terms1') return;
  termsSubStepRef.current = 'terms2';
  setTermsSubStep('terms2');

  // Deliberately NOT awaited: nothing below depends on it, and awaiting it made the collision
  // check below a coin flip on however long the round trip happened to take.
  fetch("/api/phase", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ sessionId, phase: "TERMS_FROOTS" }),
  }).catch(() => {});
  saveVoiceState(0).catch(() => {});

  // stopAudio() cut the narration mid-sentence, so a half-spoken description of the FIRST document
  // is the last assistant turn. Without this the model finishes or repeats it on the second
  // document's screen, even though the instructions below name the second document — the same
  // behaviour the intro skip hit. Harmless when the narration had already finished cleanly.
  const interruptedMarker = {
    type: "conversation.item.create",
    item: { type: "message", role: "user", content: [{ type: "input_text",
      text: '[SYSTEM: The customer tapped confirm on the FIRST document, possibly while you were still describing it. Do NOT continue or repeat that description. Speak ONLY about the second document now.]',
    }] },
  };
  const terms2Create = { type: "response.create", response: { instructions: TERMS2_EXPLAIN_INSTRUCTIONS(langRef.current) } };

  // response.cancel is asynchronous — serverResponseActiveRef only clears on response.done. Sending
  // the create now would collide ("conversation_already_has_active_response") and be dropped,
  // leaving the second document narrated by nobody. Park it; wsMessageHandler cancels a late-born
  // response on response.created and fires the parked array, in order, on response.done.
  if (serverResponseActiveRef.current || awaitingResponseCreatedRef.current) {
    pendingResponseAfterCancelRef.current = [interruptedMarker, terms2Create];
    return;
  }
  send(interruptedMarker);
  send(terms2Create);
}

/** Customer tapped "Ich bestätige" on the froots (terms2) document — transitions to Phase 1.
 *
 *  Same early-confirm handling as handleConfirmTerms1 above — it is literally the same button (the
 *  shell picks the handler off termsSubStep), and the payoff for getting it wrong here is worse: a
 *  dropped create means Phase 1 never starts speaking. */
export async function handleConfirmTerms2(ctx: VoiceContext): Promise<void> {
  const {
    sessionId, voicePhaseRef, termsSubStepRef, fastModeRef, langRef,
    serverResponseActiveRef, awaitingResponseCreatedRef, pendingResponseAfterCancelRef,
    setTermsSubStep, setVoicePhase, setFastModeIntroActive, saveVoiceState, send,
  } = ctx;
  if (termsSubStepRef.current !== 'terms2') return;
  voicePhaseRef.current   = 1;
  termsSubStepRef.current = null;
  setTermsSubStep(null);
  setVoicePhase(1);

  fetch("/api/phase", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ sessionId, phase: "QUESTIONS1" }),
  }).catch(() => {});
  // Phase 1 is push-to-talk only — disable VAD explicitly rather than inheriting whatever state
  // Phase 0's terms screens happened to leave it in. See
  // private-documents/after-demo/PHASE_1_PTT_PLAN.md.
  // A session.update is not a response — safe to send immediately either way.
  send({ type: "session.update", session: { type: "realtime", audio: { input: { turn_detection: null } } } });
  saveVoiceState(0).catch(() => {});

  // Same cut-off-turn problem as terms1: without this the model carries on describing the SECOND
  // document instead of opening Phase 1.
  const interruptedMarker = {
    type: "conversation.item.create",
    item: { type: "message", role: "user", content: [{ type: "input_text",
      text: '[SYSTEM: The customer tapped confirm on the second document, possibly while you were still describing it. Do NOT continue or repeat that description.]',
    }] },
  };
  const phase1Start = {
    type: "conversation.item.create",
    item: {
      type:    "message",
      role:    "user",
      content: [{ type: "input_text", text: "[SYSTEM: Terms confirmed. Starting Phase 1 — risk profile questions. Begin with the first topic.]" }],
    },
  };
  // Fast Mode: unlike every other Fast-Mode-skipped narration point, this ONE transition still
  // speaks — a one-time heads-up so the customer isn't left wondering why the AI suddenly goes
  // quiet. fastModeIntroActive makes the first question's card wait for this speech to finish
  // and use the full grow animation (instead of the usual instant snap) — see
  // VoiceSessionShell.tsx's auto-open effect. See
  // private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md and PRIORITY_FIXES_3RD_FEEDBACK_PLAN.md.
  if (fastModeRef.current) setFastModeIntroActive(true);
  const phase1Create = fastModeRef.current
    ? { type: "response.create", response: { instructions: FAST_MODE_INTRO_INSTRUCTIONS(langRef.current) } }
    : { type: "response.create" };

  // Park as one ordered unit if the terms2 narration is still alive — see handleConfirmTerms1.
  if (serverResponseActiveRef.current || awaitingResponseCreatedRef.current) {
    pendingResponseAfterCancelRef.current = [interruptedMarker, phase1Start, phase1Create];
    return;
  }
  send(interruptedMarker);
  send(phase1Start);
  send(phase1Create);
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
  try { localStorage.setItem(`doguide_sus_${sessionId}`, "1"); } catch {}

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
