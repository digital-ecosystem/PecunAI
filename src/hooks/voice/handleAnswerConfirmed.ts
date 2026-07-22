import { useVoiceSessionStore } from "@/store/voiceSessionStore";
import type { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import { SUSTAINABILITY_EXPLAIN_INSTRUCTIONS, ASSET_CLASS_OVERLAY, ASSET_KNOWLEDGE_EXPLAIN_INSTRUCTIONS, makeNextTopicMsg, isAskableNow, ADVISOR_PERSONA } from "./prompts";
import type { VoiceContext } from "./voiceContext";

export async function handleAnswerConfirmed(
  question: CarouselQuestion,
  value:    string,
  ctx:      VoiceContext,
): Promise<void> {
  const {
    questionsRef, answeredIdsRef, skippedIdsRef, savedAnswersRef, activeCardIdRef,
    isRevisitingRef, circleBackActiveRef, sustainabilityConfirmedRef, termsSubStepRef,
    chatOpenRef, chatAnsweredRef, knowledgeBlockerNextQRef, kbExplanationStartedRef,
    assetKnowledgeShownRef, pendingPhaseTransitionRef, fastModeRef, mutedRef,
    audioEndTimer, stateRef, langRef,
    dispatch, setCard, appendChatMessage, saveAnswer, saveVoiceState, advancePhase, send, router,
    setSavedAnswers, setTermsSubStep, setExplainOverlayData,
  } = ctx;

  const qText = (text: string) => langRef.current === "de"
    ? `Fragen Sie nach dem Thema auf Deutsch — formulieren Sie es gesprächig, lesen Sie nicht wörtlich vor: „${text}".`
    : `Translate this German question to English — conversational phrasing, not like a questionnaire: "${text}".`;

  dispatch({ type: "ANSWER_RECEIVED" });

  // ── ASSET KNOWLEDGE TWO-STRIKE: Q12/13/14 "none" — 1st attempt ──────────
  // Don't save yet — show the detailed explanation, then re-ask the SAME question once it
  // closes. See private-documents/after-demo/ASSET_KNOWLEDGE_EXPLAIN_PLAN.md.
  const isAssetKnowledgeQ = question.questionOrder !== undefined && [12, 13, 14].includes(question.questionOrder);
  if (isAssetKnowledgeQ && value === "none" && !assetKnowledgeShownRef.current.has(question.id)) {
    const overlayEntry = ASSET_CLASS_OVERLAY[question.questionOrder!];
    assetKnowledgeShownRef.current.add(question.id);
    knowledgeBlockerNextQRef.current = question; // re-ask the SAME question once the overlay closes
    kbExplanationStartedRef.current  = false;
    if (audioEndTimer.current) { clearTimeout(audioEndTimer.current); audioEndTimer.current = null; }
    dispatch({ type: "ANSWER_SAVED" });
    setExplainOverlayData(overlayEntry.data);
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: `[SYSTEM: Explanation overlay for "${overlayEntry.data.title}" is open. The customer said they don't know this topic. Give a thorough spoken explanation grounded in the source material in your instructions — cover the definition, the yield/return, and every risk mentioned. Do NOT say "take a look" or reference the screen — explain verbally. The overlay closes automatically when you finish speaking, and the customer will then be asked this question again.]`,
      }]},
    });
    send({
      type: "response.create",
      response: { instructions: ASSET_KNOWLEDGE_EXPLAIN_INSTRUCTIONS(langRef.current, question.questionOrder!) },
    });
    return;
  }

  await saveAnswer(question.id, value);
  // Derive nextIndex from question position — more reliable than stateRef.
  const qIdx     = questionsRef.current.findIndex(q => q.id === question.id);
  let nextIndex  = qIdx >= 0 ? qIdx + 1 : stateRef.current.currentQuestionIndex + 1;
  // If the immediately-following flat entry is THIS question's sub-question
  // (12.1/13.1/14.1) and the answer doesn't make it relevant (only "good"
  // does), skip it in the SAVED resume index — otherwise a reload lands the
  // card on an irrelevant sub-question while the AI (whose prompt list
  // excludes sub-questions entirely) resumes on the next real one.
  const followingQ = questionsRef.current[nextIndex];
  if (
    followingQ?.questionOrder !== undefined &&
    followingQ.questionOrder % 1 !== 0 &&
    Math.floor(followingQ.questionOrder) === question.questionOrder &&
    value !== "good"
  ) {
    nextIndex += 1;
  }
  await saveVoiceState(nextIndex);

  // Track answered ID before coverage check so the counts are up-to-date.
  answeredIdsRef.current.add(question.id);
  skippedIdsRef.current.delete(question.id);
  setSavedAnswers(prev => ({ ...prev, [question.id]: value }));
  savedAnswersRef.current = { ...savedAnswersRef.current, [question.id]: value };
  useVoiceSessionStore.getState().markAnswered(question.id, value);
  const tapLabel = (question.options ?? []).find(o => o.value === value || o.id === value)?.label ?? value;
  appendChatMessage(tapLabel, "user", question.id);

  // ── SUSTAINABILITY TERMS: show disclosure modal after Q2 is answered ──
  // Never re-shown during revisit — reaching revisit means Phase 1 (and this disclosure)
  // already completed once, regardless of the confirmed-flag's state.
  if (question.questionOrder === 2 && !isRevisitingRef.current && !sustainabilityConfirmedRef.current) {
    setTermsSubStep('sustainabilityTerms');
    termsSubStepRef.current = 'sustainabilityTerms';
    saveVoiceState(questionsRef.current.findIndex(q => q.id === question.id)).catch(() => {});
    // Fast Mode: keep the context update (grounds on-demand PTT questions about
    // the disclosure) but skip the intro narration entirely — a NEUTRAL text
    // without the "introduce this document" directive, so no later response
    // can act on it. Without the gate, the ungated intro could still be
    // in-flight at confirm time and start playing right as Q3 arrives
    // (stopAudio can't cancel a response that hasn't been created yet).
    if (fastModeRef.current) {
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: "[SYSTEM: PHASE 1 PAUSED. The sustainability disclosure document is now displayed on screen. Fast Mode is ON — do NOT speak. The customer reads and confirms it on screen; they can hold the microphone button to ask questions about it.]",
        }]},
      });
      if (!mutedRef.current) dispatch({ type: "AI_DONE" });
      return;
    }
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: "[SYSTEM: PHASE 1 PAUSED. The sustainability disclosure document is now displayed on screen. STOP asking Phase 1 questions. Introduce this document (1–2 sentences), tell the customer to read it and tap confirm, mention they can hold the microphone button to ask questions about it. Then STOP — do not speak further until they confirm.]",
      }]},
    });
    send({ type: "response.create", response: { instructions: SUSTAINABILITY_EXPLAIN_INSTRUCTIONS(langRef.current) } });
    return;
  }

  // ── BLOCKER: Q3 sustainability info not received → session ends ──
  if (question.questionOrder === 3 && value === "no") {
    pendingPhaseTransitionRef.current = () => router.push("/customer/dashboard");
    send({
      type: "response.create",
      response: {
        instructions: `${ADVISOR_PERSONA(langRef.current)} Der Kunde hat angegeben, die Nachhaltigkeitsinformationen nicht erhalten zu haben. Erklären Sie in 2–3 Sätzen freundlich aber klar: Gemäß den gesetzlichen Vorschriften ist es erforderlich, dass Sie die Nachhaltigkeitsinformationen zur Kenntnis genommen haben, bevor die Beratung fortgesetzt werden kann. Wir empfehlen, sich mit einem persönlichen Berater in Verbindung zu setzen. Verabschieden Sie sich herzlich.`,
      },
    });
    return;
  }

  // ── BLOCKER: Q4 sustainability preference ────────────────────────
  if (question.questionOrder === 4 && (value === "yes" || value === "no")) {
    pendingPhaseTransitionRef.current = () => router.push("/customer/dashboard");
    send({
      type: "response.create",
      response: {
        instructions: `${ADVISOR_PERSONA(langRef.current)} Der Kunde hat eine Nachhaltigkeitspräferenz angegeben, die mit dem aktuellen Produktangebot nicht abgedeckt werden kann. Erklären Sie in 2–3 Sätzen freundlich aber klar: Aufgrund der angegebenen Nachhaltigkeitspräferenzen ist eine persönliche Beratung erforderlich — das aktuelle Produktangebot deckt diese Präferenz nicht vollständig ab. Ein Berater wird sich in Kürze bei Ihnen melden. Verabschieden Sie sich herzlich.`,
      },
    });
    return;
  }

  // ── BLOCKER: Q7 income check ─────────────────────────────────────
  if (question.questionOrder === 7) {
    const q6        = questionsRef.current.find(q => q.questionOrder === 6);
    const incomeStr = q6 ? savedAnswersRef.current[q6.id] : undefined;
    const income    = parseFloat(incomeStr ?? "0");
    const expenses  = parseFloat(value);
    if (!isNaN(income) && !isNaN(expenses) && (income - expenses) <= 150) {
      pendingPhaseTransitionRef.current = () => router.push("/customer/dashboard");
      send({
        type: "response.create",
        response: {
          instructions: `${ADVISOR_PERSONA(langRef.current)} Das verfügbare monatliche Einkommen des Kunden beträgt nach Abzug der Ausgaben weniger als 150 Euro. Erklären Sie in 2–3 Sätzen verständnisvoll: Aufgrund der angegebenen finanziellen Verhältnisse ist eine Investition zum aktuellen Zeitpunkt leider nicht empfehlenswert — das verfügbare monatliche Budget reicht für eine sinnvolle Anlage nicht aus. Eine persönliche Beratung wird empfohlen. Verabschieden Sie sich herzlich.`,
        },
      });
      return;
    }
  }

  // ── ASSET KNOWLEDGE TWO-STRIKE: Q12/13/14 "none" — 2nd (final) attempt ──
  // Reaching here means assetKnowledgeShownRef already had this question — the customer still
  // doesn't understand it after seeing the explanation. Hard-block, same pattern as the Q3
  // sustainability blocker above. Placed before end-of-phase detection runs so this can't be
  // bypassed by advancePhase() if it happens to be the last remaining question.
  if (isAssetKnowledgeQ && value === "none") {
    const overlayEntry = ASSET_CLASS_OVERLAY[question.questionOrder!];
    pendingPhaseTransitionRef.current = () => router.push("/customer/dashboard");
    send({
      type: "response.create",
      response: {
        instructions: `${ADVISOR_PERSONA(langRef.current)} Der Kunde hat angegeben, "${overlayEntry.data.title}" auch nach der Erklärung nicht zu verstehen. Erklären Sie in 2–3 Sätzen freundlich aber klar: Gemäß den gesetzlichen Vorschriften ist ein ausreichendes Verständnis dieser Anlageklasse erforderlich, bevor die Beratung fortgesetzt werden kann. Wir empfehlen, sich mit einem persönlichen Berater in Verbindung zu setzen. Verabschieden Sie sich herzlich.`,
      },
    });
    return;
  }

  // Sub-question auto-skip: if value != "good", skip decimal-order sub-questions (mirrors voice path).
  const subQsTap = questionsRef.current.filter(q =>
    q.questionOrder !== undefined &&
    q.questionOrder % 1 !== 0 &&
    Math.floor(q.questionOrder) === question.questionOrder
  );
  if (subQsTap.length > 0 && value !== "good") {
    subQsTap.forEach(sq => answeredIdsRef.current.add(sq.id));
  }

  // Revisit-only: if the parent answer just changed TO "good" and its sub-question was only
  // ever silently hidden (never given a real answer), un-hide it and ask it directly instead of
  // leaving it hidden forever. See private-documents/after-demo/PHASE_1_REVISIT_FIX_PLAN.md.
  let revisitSubQ: CarouselQuestion | null = null;
  if (isRevisitingRef.current && subQsTap.length > 0 && value === "good") {
    const sq = subQsTap[0];
    if (answeredIdsRef.current.has(sq.id) && !savedAnswersRef.current[sq.id]) {
      answeredIdsRef.current.delete(sq.id);
      revisitSubQ = sq;
    }
  }

  if (chatOpenRef.current) {
    chatAnsweredRef.current++;

    // Askable-based detection (same reasoning as the voice path below) — a raw count against
    // questionsRef.length breaks once a non-askable sub-question exists.
    const remainingNonSkipped = questionsRef.current.filter(
      q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id) && isAskableNow(q, questionsRef.current, savedAnswersRef.current)
    );
    const skippedRemaining = questionsRef.current.filter(q => skippedIdsRef.current.has(q.id));

    // Nothing askable left and nothing parked as skipped — Phase 1 is complete.
    if (remainingNonSkipped.length === 0 && skippedRemaining.length === 0) {
      await advancePhase();
      return;
    }

    // All non-skipped covered — circle back to skipped topics inside chat
    if (remainingNonSkipped.length === 0 && skippedRemaining.length > 0) {
      const firstSkipped = skippedRemaining[0];
      const skippedIdx = questionsRef.current.findIndex(q => q.id === firstSkipped.id);
      if (skippedIdx >= 0) dispatch({ type: "SET_INDEX", index: skippedIdx });
      setCard(firstSkipped.id);
      // Queue a history entry so the AI knows this question was answered in chat.
      // Without this, the AI sees a gap: it was asking about this topic mid-voice, then
      // notifyChatOpen(false) tells it to ask about the next skipped topic — with no record
      // of how the current one got answered.
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: `[SYSTEM: Answer saved via chat for topic "${question.category}" (ID: ${question.id}) — value: "${tapLabel}". ` +
            `These skipped topics still need answers: ` +
            `${skippedRemaining.map(q => `"${q.id}" (${q.category})`).join(", ")}. ` +
            `Do NOT respond yet — wait for the customer to close the chat.]`,
        }]},
      });
      return; // no response.create — notifyChatOpen(false) sends the consolidated prompt on close
    }

    // Normal advance to next non-skipped question
    const nextQ    = remainingNonSkipped[0] ?? null;
    const nextQIdx = nextQ ? questionsRef.current.findIndex(q => q.id === nextQ.id) : -1;
    if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
    setCard(nextQ?.id ?? null);

    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: `[SYSTEM: Answer saved via chat. Remaining topic IDs (in order): ` +
          `${remainingNonSkipped.map(q => q.id).join(", ")}.]`,
      }]},
    });
    return; // no response.create — notifyChatOpen(false) sends one consolidated prompt on close
  }

  // End-of-phase detection is based on what's still ASKABLE right now — NOT a raw count
  // against questionsRef.length. Sub-questions (12.1/13.1/14.1) whose parent wasn't answered
  // "good" never become askable, so they're never answered or skipped, yet they still inflate
  // questionsRef.length. Comparing counts against that total meant answered+skipped could never
  // reach it once such a sub-question existed: the circle-back branch went dead and skipped
  // topics were never revisited before Phase 2. See isAskableNow.
  const remaining = questionsRef.current
    .filter(q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id) && isAskableNow(q, questionsRef.current, savedAnswersRef.current))
    .map(q => q.id);
  const nothingLeftToAsk = remaining.length === 0;

  if (nothingLeftToAsk && skippedIdsRef.current.size === 0 && !isRevisitingRef.current) {
    circleBackActiveRef.current = false;
    await advancePhase();
    return;
  }

  if (nothingLeftToAsk && skippedIdsRef.current.size > 0 && !isRevisitingRef.current) {
    const firstSkippedTap = questionsRef.current.find(q => skippedIdsRef.current.has(q.id));
    const allSkippedTap   = questionsRef.current.filter(q => skippedIdsRef.current.has(q.id));
    dispatch({ type: "ANSWER_SAVED" });
    setCard(firstSkippedTap?.id ?? null);
    send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: firstSkippedTap
          ? `[SYSTEM: All main topics are answered. Now circle back through ${allSkippedTap.length} skipped topic(s). Your ONLY next topic is "${firstSkippedTap.category}" (ID: ${firstSkippedTap.id}). Ask about this now. Remaining skipped after this: ${allSkippedTap.slice(1).map(q => q.id).join(", ") || "none"}.`
          : `[SYSTEM: All topics answered. Session complete.]`,
        }],
      },
    });
    const isFirstCircleBackTap = !circleBackActiveRef.current;
    if (isFirstCircleBackTap) circleBackActiveRef.current = true;
    // Fast Mode: context above stays updated so an on-demand PTT question still has it, but skip
    // the auto-narration itself. No response.create means no audio is coming, so the
    // ANSWER_SAVED dispatch above (which optimistically flips session to "speaking") must be
    // corrected back to "listening" here — otherwise the state gets stuck and the next
    // question's modal never auto-opens. See private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md.
    if (fastModeRef.current) {
      if (!mutedRef.current) dispatch({ type: "AI_DONE" });
      return;
    }
    send({
      type: "response.create",
      response: firstSkippedTap ? {
        instructions: isFirstCircleBackTap
          ? `${ADVISOR_PERSONA(langRef.current)} Alle Hauptthemen sind beantwortet. Sagen Sie in 1 Satz sachlich, dass Sie noch auf die zurückgestellten Themen zurückkommen, und stellen Sie dann die Frage zum Thema ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}). ${qText(firstSkippedTap.text)} Maximal 2 Sätze. Fragen Sie NUR nach ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}). Warten Sie auf die Antwort.`
          : `${ADVISOR_PERSONA(langRef.current)} Stellen Sie direkt die Frage zum nächsten zurückgestellten Thema ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}). ${qText(firstSkippedTap.text)} Maximal 2 kurze Sätze. Fragen Sie NUR nach ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}). Warten Sie auf die Antwort.`,
      } : {},
    });
    return;
  }

  dispatch({ type: "ANSWER_SAVED" });

  if (isRevisitingRef.current) {
    if (revisitSubQ) {
      const subIdx = questionsRef.current.findIndex(q => q.id === revisitSubQ!.id);
      if (subIdx >= 0) dispatch({ type: "SET_INDEX", index: subIdx });
      setCard(revisitSubQ.id);
      const subOptions = revisitSubQ.options?.map(o => `"${o.value ?? o.label}"`).join(", ") ?? "";
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: `[SYSTEM: Customer changed "${question.category}" to confirm they have used it. Now ask the follow-up: "${revisitSubQ.text}" (ID: ${revisitSubQ.id}). Valid values: ${subOptions}. Revisit mode is still active — after they answer, ask if they want to change anything else or are ready to see the updated recommendation.]`,
        }]},
      });
      // Fast Mode: see the fuller note on the circle-back block above — same fix applies.
      if (fastModeRef.current) {
        if (!mutedRef.current) dispatch({ type: "AI_DONE" });
        return;
      }
      send({
        type: "response.create",
        response: {
          instructions: `${ADVISOR_PERSONA(langRef.current)} Der Kunde hat bei "${question.category}" bestätigt, dass er/sie dies bereits genutzt hat. Stellen Sie direkt die Folgefrage: ${qText(revisitSubQ.text)} (ID: ${revisitSubQ.id}). Maximal 2 kurze Sätze. Warten Sie auf die Antwort.`,
        },
      });
      return;
    }
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: `[SYSTEM: Answer saved for topic "${question.category}" (ID: ${question.id}) — new value: "${value}". Revisit mode is still active. Ask warmly in 1 sentence if the customer wants to change anything else, or if they are ready to see the updated product recommendation. Do NOT call submit_answer or navigate. Wait for their response.]`,
      }]},
    });
    // Fast Mode: see the fuller note on the circle-back block above — same fix applies.
    if (fastModeRef.current) {
      if (!mutedRef.current) dispatch({ type: "AI_DONE" });
      return;
    }
    send({
      type: "response.create",
      response: {
        instructions: `${ADVISOR_PERSONA(langRef.current)} Die Antwort wurde gespeichert. Fragen Sie in 1 Satz: Möchte der Kunde noch etwas anderes ändern, oder ist er bereit, die aktualisierte Produktempfehlung zu sehen?`,
      },
    });
    return;
  }

  const nextQIdx = remaining.length > 0 ? questionsRef.current.findIndex(q => q.id === remaining[0]) : -1;
  if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
  setCard(remaining[0] ?? null);

  const label = (question.options ?? []).find(o => o.value === value)?.label ?? value;
  const remainingQsTap = remaining.map(id => questionsRef.current.find(q => q.id === id)!).filter(Boolean) as CarouselQuestion[];
  send({
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: remainingQsTap.length > 0
        ? `[SYSTEM: Answer already saved — do NOT call submit_answer. The customer tapped "${label}". ${makeNextTopicMsg(remainingQsTap[0], remaining.slice(1), false).replace("[SYSTEM: ", "")}`
        : `[SYSTEM: Answer already saved. All topics complete.]`,
      }],
    },
  });
  // Fast Mode: see the fuller note on the circle-back block above — same fix applies.
  if (fastModeRef.current) {
    if (!mutedRef.current) dispatch({ type: "AI_DONE" });
    return;
  }
  send({
    type: "response.create",
    response: remainingQsTap[0] ? {
      instructions: `${ADVISOR_PERSONA(langRef.current)} Die Antwort ist gespeichert — bewerten Sie sie inhaltlich nicht. Bestätigen Sie kurz und freundlich (variieren Sie die Formulierung) und stellen Sie dann die Frage zum Thema ${remainingQsTap[0].category} (ID: ${remainingQsTap[0].id}). ${qText(remainingQsTap[0].text)} Maximal 2 kurze Sätze. Sagen Sie nie „Weiter" oder „Nächste Frage". Fragen Sie NUR nach ${remainingQsTap[0].category} (ID: ${remainingQsTap[0].id}). Warten Sie auf die Antwort.`,
    } : {},
  });
}
