import { useVoiceSessionStore } from "@/store/voiceSessionStore";
import type { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import { SUSTAINABILITY_EXPLAIN_INSTRUCTIONS, ASSET_CLASS_OVERLAY, ASSET_KNOWLEDGE_CONTEXT_MSG, ASSET_KNOWLEDGE_INTRO_INSTRUCTIONS, makeNextTopicMsg, isAskableNow, ADVISOR_PERSONA, GERMAN_SPEECH_DIRECTIVE } from "./prompts";
import type { VoiceContext } from "./voiceContext";

export async function handleFunctionCall(
  name:     string,
  argsJson: string,
  callId:   string,
  ctx:      VoiceContext,
): Promise<void> {
  const {
    questionsRef, stateRef, savedAnswersRef, answeredIdsRef, skippedIdsRef,
    activeCardIdRef, voicePhaseRef, suppressNavBackRef, langRef, isRevisitingRef, circleBackActiveRef,
    explainOpenRef, knowledgeBlockerNextQRef, kbExplanationStartedRef, audioEndTimer,
    termsSubStepRef, explainedQuestionsRef, chatOpenRef, pttVectorStoreRef,
    sustainabilityConfirmedRef, pendingVoiceTranscriptRef, applyPendingTranscriptRef,
    skipInProgressRef, prevInProgressRef, assetKnowledgeShownRef, pendingPhaseTransitionRef, fastModeRef, mutedRef,
    explainAwaitConfirmRef, explainAssetOrderRef,
    send, dispatch, setCard, appendChatMessage, saveAnswer, saveVoiceState, blockSession, advancePhase,
    advanceToPersonalInfo, confirmInvestment, confirmContracts, confirmReadyToSign,
    backToPersonalInfo, backToInvestment, backToContracts, setIsRevisiting_internal, router, sessionId,
    setPendingVoiceAnswer, setExplainOverlayData, setTermsSubStep,
    setVoicePhase, setProductSuggestion, setSavedAnswers, setVoiceAnswerCount, setChatMessages,
  } = ctx;

  const langTag = () => langRef.current === "de"
    ? GERMAN_SPEECH_DIRECTIVE
    : `English only.`;
  const qText = (text: string) => langRef.current === "de"
    ? `Fragen Sie nach dem Thema auf Deutsch — formulieren Sie es gesprächig, lesen Sie nicht wörtlich vor: „${text}".`
    : `Translate this German question to English — conversational phrasing, not like a questionnaire: "${text}".`;

  try {
    const args = JSON.parse(argsJson) as Record<string, string>;

    const sendResult = (result: object) => send({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) },
    });

    if (name === "highlight_answer") {
      const { questionId, value, label } = args;
      console.log("[voice] highlight_answer →", { questionId, value, label });
      setPendingVoiceAnswer({ questionId, value, label });
      setCard(questionId);
      sendResult({ success: true });
      send({ type: "response.create" }); // prompt AI to speak "Got it — X. Is that correct?"
      return;
    }

    if (name === "submit_answer") {
      if (explainOpenRef.current) {
        sendResult({ success: false, reason: "Explanation overlay is open — do not submit answers here" });
        return;
      }
      if (termsSubStepRef.current === 'sustainabilityTerms') {
        sendResult({ success: false, reason: "Sustainability disclosure is open — Phase 1 answers are blocked until the customer confirms" });
        return;
      }
      const { questionId, value } = args;

      // Validate value against the question definition before doing anything.
      // Rejects hallucinated values (e.g. fragments of ambient audio like "And")
      // that don't match any valid option or type constraint.
      const validatingQ = questionsRef.current.find(q => q.id === questionId);

      // Reject conditional sub-questions (e.g. 12.1, 13.1, 14.1) if parent answer ≠ "good"
      if (validatingQ?.questionOrder !== undefined && validatingQ.questionOrder % 1 !== 0) {
        const parentOrder = Math.floor(validatingQ.questionOrder);
        const parentQ     = questionsRef.current.find(q => q.questionOrder === parentOrder);
        if (parentQ && savedAnswersRef.current[parentQ.id] !== "good") {
          pendingVoiceTranscriptRef.current = null;
          sendResult({ success: false, reason: `Question ${validatingQ.questionOrder} is conditional and should be skipped — parent question ${parentOrder} was not answered "good".` });
          return;
        }
      }

      if (validatingQ) {
        if (validatingQ.options?.length) {
          const validValues = validatingQ.options.map(o => o.value ?? o.id);
          if (!validValues.includes(value)) {
            pendingVoiceTranscriptRef.current = null;
            sendResult({ success: false, reason: `"${value}" is not a valid option. Valid values: ${validValues.join(", ")}` });
            return;
          }
        } else if (validatingQ.questionType === "number") {
          const num = parseFloat(value);
          if (isNaN(num)) {
            pendingVoiceTranscriptRef.current = null;
            sendResult({ success: false, reason: `"${value}" is not a valid number.` });
            return;
          }
          // FORM-001: Q19 (monthly savings) allows 0 (no plan) or 75+. 1–74 is invalid.
          if (validatingQ.questionOrder === 19) {
            if (num !== 0 && num < 75) {
              pendingVoiceTranscriptRef.current = null;
              sendResult({ success: false, reason: `Monthly savings must be either 0 (no savings plan) or at least €75. Values between 1 and 74 are not valid.` });
              return;
            }
          } else {
            if (validatingQ.minValue !== undefined && num < validatingQ.minValue) {
              pendingVoiceTranscriptRef.current = null;
              sendResult({ success: false, reason: `Value must be at least ${validatingQ.minValue}.` });
              return;
            }
          }
          if (validatingQ.maxValue !== undefined && num > validatingQ.maxValue) {
            pendingVoiceTranscriptRef.current = null;
            sendResult({ success: false, reason: `Value must be at most ${validatingQ.maxValue}.` });
            return;
          }
        }
        // free-text questions: accept any non-empty value
        if (validatingQ.questionType !== "number" && !validatingQ.options?.length && !value?.trim()) {
          pendingVoiceTranscriptRef.current = null;
          sendResult({ success: false, reason: "Answer cannot be empty." });
          return;
        }
      }

      setPendingVoiceAnswer(null);
      dispatch({ type: "ANSWER_RECEIVED" });

      // ── ASSET KNOWLEDGE TWO-STRIKE: Q12/13/14 "none" — 1st attempt ──────────
      // Don't save yet — show the detailed explanation, then re-ask the SAME question once it
      // closes. See private-documents/after-demo/ASSET_KNOWLEDGE_EXPLAIN_PLAN.md.
      const isAssetKnowledgeQ = validatingQ?.questionOrder !== undefined && [12, 13, 14].includes(validatingQ.questionOrder);
      if (isAssetKnowledgeQ && value === "none" && !assetKnowledgeShownRef.current.has(questionId)) {
        const overlayEntry = ASSET_CLASS_OVERLAY[validatingQ!.questionOrder!];
        pendingVoiceTranscriptRef.current = null;
        sendResult({ success: true });
        assetKnowledgeShownRef.current.add(questionId);
        knowledgeBlockerNextQRef.current = validatingQ!; // re-ask the SAME question once the overlay closes
        kbExplanationStartedRef.current  = false;
        // Read-and-confirm mode — see the identical branch in handleAnswerConfirmed.ts and
        // private-documents/after-demo/ASSET_EXPLAIN_READ_AND_CONFIRM_PLAN.md.
        explainAwaitConfirmRef.current = true;
        explainAssetOrderRef.current   = validatingQ!.questionOrder!;
        if (audioEndTimer.current) { clearTimeout(audioEndTimer.current); audioEndTimer.current = null; }
        dispatch({ type: "ANSWER_SAVED" });
        setExplainOverlayData(overlayEntry.data);
        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text",
            text: ASSET_KNOWLEDGE_CONTEXT_MSG(validatingQ!.questionOrder!),
          }]},
        });
        send({
          type: "response.create",
          response: { instructions: ASSET_KNOWLEDGE_INTRO_INSTRUCTIONS(langRef.current, validatingQ!.questionOrder!) },
        });
        return;
      }

      await saveAnswer(questionId, value);

      const qIdx     = questionsRef.current.findIndex(q => q.id === questionId);
      let nextIndex  = qIdx >= 0 ? qIdx + 1 : stateRef.current.currentQuestionIndex + 1;
      // Same sub-question skip as handleAnswerConfirmed's save: don't persist
      // a resume index pointing at a 12.1/13.1/14.1 the answer just made
      // irrelevant (only "good" makes them relevant).
      const savedParentQ = qIdx >= 0 ? questionsRef.current[qIdx] : undefined;
      const followingQ   = questionsRef.current[nextIndex];
      if (
        followingQ?.questionOrder !== undefined &&
        followingQ.questionOrder % 1 !== 0 &&
        savedParentQ?.questionOrder !== undefined &&
        Math.floor(followingQ.questionOrder) === savedParentQ.questionOrder &&
        value !== "good"
      ) {
        nextIndex += 1;
      }
      await saveVoiceState(nextIndex);

      // Track answered ID and store value so tapping the card later shows it pre-filled.
      answeredIdsRef.current.add(questionId);
      skippedIdsRef.current.delete(questionId);
      setSavedAnswers(prev => ({ ...prev, [questionId]: value }));
      savedAnswersRef.current = { ...savedAnswersRef.current, [questionId]: value };
      useVoiceSessionStore.getState().markAnswered(questionId, value);

      // ── BLOCKER: Q3 sustainability info not received → session ends ──
      if (validatingQ?.questionOrder === 3 && value === "no") {
        blockSession("q3_sustainability_info_not_received");
        pendingVoiceTranscriptRef.current = null;
        sendResult({ success: true });
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
      // "yes" (must have sustainable) or "no" (refuses all sustainable) → session ends.
      // "neutral" → continue normally.
      if (validatingQ?.questionOrder === 4 && (value === "yes" || value === "no")) {
        blockSession("q4_sustainability_preference_unsupported");
        pendingVoiceTranscriptRef.current = null;
        sendResult({ success: true });
        pendingPhaseTransitionRef.current = () => router.push("/customer/dashboard");
        send({
          type: "response.create",
          response: {
            instructions: `${ADVISOR_PERSONA(langRef.current)} Der Kunde hat eine Nachhaltigkeitspräferenz angegeben, die mit dem aktuellen Produktangebot nicht abgedeckt werden kann. Erklären Sie in 2–3 Sätzen freundlich aber klar: Aufgrund der angegebenen Nachhaltigkeitspräferenzen ist eine persönliche Beratung erforderlich — das aktuelle Produktangebot deckt diese Präferenz nicht vollständig ab. Ein Berater wird sich in Kürze bei Ihnen melden. Verabschieden Sie sich herzlich.`,
          },
        });
        return;
      }

      // ── BLOCKER: Q7 income check — monthly income minus expenses ≤ €150 ──
      // Q7 is monthly expenses. Check after it's answered, using Q6 (income) already saved.
      if (validatingQ?.questionOrder === 7) {
        const q6         = questionsRef.current.find(q => q.questionOrder === 6);
        const incomeStr  = q6 ? savedAnswersRef.current[q6.id] : undefined;
        const income     = parseFloat(incomeStr ?? "0");
        const expenses   = parseFloat(value);
        if (!isNaN(income) && !isNaN(expenses) && (income - expenses) <= 150) {
          blockSession("q7_insufficient_disposable_income");
          pendingVoiceTranscriptRef.current = null;
          sendResult({ success: true });
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
      // Reaching here means assetKnowledgeShownRef already had this question — the customer
      // still doesn't understand it after seeing the explanation. Hard-block, same pattern as
      // the Q3/Q4/Q7 blockers above. Placed before end-of-phase detection runs (further below)
      // so this can't be bypassed by advancePhase() if it happens to be the last remaining question.
      if (isAssetKnowledgeQ && value === "none") {
        const overlayEntry = ASSET_CLASS_OVERLAY[validatingQ!.questionOrder!];
        blockSession(`q${validatingQ!.questionOrder}_asset_knowledge_insufficient`);
        pendingVoiceTranscriptRef.current = null;
        sendResult({ success: true });
        pendingPhaseTransitionRef.current = () => router.push("/customer/dashboard");
        send({
          type: "response.create",
          response: {
            instructions: `${ADVISOR_PERSONA(langRef.current)} Der Kunde hat angegeben, "${overlayEntry.data.title}" auch nach der Erklärung nicht zu verstehen. Erklären Sie in 2–3 Sätzen freundlich aber klar: Gemäß den gesetzlichen Vorschriften ist ein ausreichendes Verständnis dieser Anlageklasse erforderlich, bevor die Beratung fortgesetzt werden kann. Wir empfehlen, sich mit einem persönlichen Berater in Verbindung zu setzen. Verabschieden Sie sich herzlich.`,
          },
        });
        return;
      }

      // ── SUSTAINABILITY TERMS: show disclosure modal after Q2 is answered ──
      // Never re-shown during revisit — reaching revisit means Phase 1 (and this disclosure)
      // already completed once, regardless of the confirmed-flag's state.
      if (validatingQ?.questionOrder === 2) {
        pendingVoiceTranscriptRef.current = null;
        sendResult({ success: true });
        if (!isRevisitingRef.current && !sustainabilityConfirmedRef.current) {
          setTermsSubStep('sustainabilityTerms');
          termsSubStepRef.current = 'sustainabilityTerms';
          saveVoiceState(questionsRef.current.findIndex(q => q.id === questionId)).catch(() => {});
          // Fast Mode: same gate as the tap path (handleAnswerConfirmed) —
          // neutral context only, no intro narration, AI_DONE correction.
          if (fastModeRef.current && !chatOpenRef.current) {
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
        // Sustainability already confirmed this session, or we're in revisit — skip modal and fall through.
      }

      // Handle sub-questions (12.1, 13.1, 14.1) based on parent answer.
      // Sub-questions are NOT in the system prompt — they are injected via SYSTEM message only when needed.
      const parentQ = questionsRef.current.find(q => q.id === questionId);
      let revisitSubQ: CarouselQuestion | null = null;
      if (parentQ?.questionOrder !== undefined && parentQ.questionOrder % 1 === 0) {
        const subQs = questionsRef.current.filter(q =>
          q.questionOrder !== undefined &&
          q.questionOrder % 1 !== 0 &&
          Math.floor(q.questionOrder) === parentQ.questionOrder
        );
        if (value === "good" && subQs.length > 0) {
          // Parent = "good" → inject SYSTEM message so AI knows to ask the sub-question next
          const sq = subQs[0];
          const sqOptions = sq.options?.map(o => `"${o.value ?? o.label}"`).join(", ") ?? "";
          send({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text",
              text: `[SYSTEM: Customer confirmed they have used ${parentQ.category}. Now ask the follow-up: "${sq.text}" (ID: ${sq.id}). Valid values: ${sqOptions}. Ask it naturally, then wait for the answer before moving on.]`,
            }]},
          });
          // Revisit-only: if this sub-question was only ever silently hidden (parent's old
          // answer wasn't "good") and never given a real answer, un-hide it so it's reachable
          // again. See private-documents/after-demo/PHASE_1_REVISIT_FIX_PLAN.md.
          if (isRevisitingRef.current && answeredIdsRef.current.has(sq.id) && !savedAnswersRef.current[sq.id]) {
            answeredIdsRef.current.delete(sq.id);
            revisitSubQ = sq;
          }
        } else {
          // Parent ≠ "good" → mark sub-questions as answered so they never appear in remaining or circle-back
          subQs.forEach(sq => answeredIdsRef.current.add(sq.id));
        }
      }
      const answeredQ   = questionsRef.current[qIdx];
      const voiceLabel  = (answeredQ?.options ?? []).find(o => o.value === value || o.id === value)?.label ?? value;
      // In chat mode the user bubble was already appended by sendChatMessage — skip it here.
      // In voice mode, use the verbatim transcript if available, else the mapped label.
      if (!chatOpenRef.current) {
        const transcript = pendingVoiceTranscriptRef.current;
        const chatLabel  = transcript ?? voiceLabel;
        appendChatMessage(chatLabel, "user", questionId);

        if (!transcript) {
          // Transcript hasn't arrived yet (race: response.done beat transcription.completed).
          // Capture questionId so the closure can update the right bubble when transcript lands.
          const capturedQId = questionId;
          applyPendingTranscriptRef.current = (t: string) => {
            setChatMessages(prev => {
              const revIdx = [...prev].reverse().findIndex(
                m => m.sender === "user" && m.questionId === capturedQId
              );
              if (revIdx === -1) return prev;
              const realIdx = prev.length - 1 - revIdx;
              return prev.map((m, i) => i === realIdx ? { ...m, text: t } : m);
            });
          };
        } else {
          applyPendingTranscriptRef.current = null;
        }
      }
      pendingVoiceTranscriptRef.current = null;
      const remaining = questionsRef.current
        .filter(q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id) && isAskableNow(q, questionsRef.current, savedAnswersRef.current))
        .map(q => q.id);

      sendResult({ success: true });
      setVoiceAnswerCount(c => c + 1);

      // Askable-based end detection — a raw count against questionsRef.length breaks once a
      // non-askable sub-question (parent not answered "good") exists: answered+skipped can never
      // reach the total, so circle-back never fires and skipped topics are skipped forever. See
      // isAskableNow + the matching fix in handleAnswerConfirmed.ts.
      const nothingLeftToAsk = remaining.length === 0;

      if (nothingLeftToAsk && skippedIdsRef.current.size === 0 && !isRevisitingRef.current) {
        circleBackActiveRef.current = false;
        await advancePhase();
        return;
      }

      if (nothingLeftToAsk && skippedIdsRef.current.size > 0 && !isRevisitingRef.current) {
        dispatch({ type: "ANSWER_SAVED" });
        const firstSkipped    = questionsRef.current.find(q => skippedIdsRef.current.has(q.id));
        const allSkippedQs    = questionsRef.current.filter(q => skippedIdsRef.current.has(q.id));
        setCard(firstSkipped?.id ?? null);
        send({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: firstSkipped
              ? `[SYSTEM: All main topics are answered. Now circle back through ${allSkippedQs.length} skipped topic(s). Your ONLY next topic is "${firstSkipped.category}" (ID: ${firstSkipped.id}). Ask about this now. Remaining skipped after this: ${allSkippedQs.slice(1).map(q => q.id).join(", ") || "none"}.`
              : `[SYSTEM: All topics answered. Session complete.]`,
            }],
          },
        });
        const isFirstCircleBack = !circleBackActiveRef.current;
        if (isFirstCircleBack) circleBackActiveRef.current = true;
        // Fast Mode: context above stays updated so an on-demand PTT question still has it, but
        // skip the auto-narration itself — except in chat mode, which always replies in text
        // regardless (cheap, and the customer is actively waiting on a reply there). No
        // response.create means no audio is coming, so the ANSWER_SAVED dispatch above (which
        // optimistically flips session to "speaking") must be corrected back to "listening" here
        // — otherwise the state gets stuck and the next question's modal never auto-opens. See
        // private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md.
        if (fastModeRef.current && !chatOpenRef.current) {
          if (!mutedRef.current) dispatch({ type: "AI_DONE" });
          return;
        }
        send({
          type: "response.create",
          response: {
            ...(chatOpenRef.current ? { output_modalities: ["text"] as const } : {}),
            ...(firstSkipped ? {
              instructions: isFirstCircleBack
                ? `${ADVISOR_PERSONA(langRef.current)} Alle Hauptthemen sind beantwortet. Sagen Sie in 1 Satz sachlich, dass Sie noch auf die zurückgestellten Themen zurückkommen, und stellen Sie dann die Frage zum Thema ${firstSkipped.category} (ID: ${firstSkipped.id}). ${qText(firstSkipped.text)} Maximal 2 Sätze. Fragen Sie NUR nach ${firstSkipped.category} (ID: ${firstSkipped.id}). Warten Sie auf die Antwort.`
                : `${ADVISOR_PERSONA(langRef.current)} Stellen Sie direkt die Frage zum nächsten zurückgestellten Thema ${firstSkipped.category} (ID: ${firstSkipped.id}). ${qText(firstSkipped.text)} Maximal 2 kurze Sätze. Fragen Sie NUR nach ${firstSkipped.category} (ID: ${firstSkipped.id}). Warten Sie auf die Antwort.`,
            } : {}),
          },
        });
        return;
      }

      if (isRevisitingRef.current) {
        dispatch({ type: "ANSWER_SAVED" });
        if (revisitSubQ) {
          const subIdx = questionsRef.current.findIndex(q => q.id === revisitSubQ!.id);
          if (subIdx >= 0) dispatch({ type: "SET_INDEX", index: subIdx });
          setCard(revisitSubQ.id);
          // Fast Mode: see the fuller note on the circle-back block above — same fix applies.
          if (fastModeRef.current && !chatOpenRef.current) {
            if (!mutedRef.current) dispatch({ type: "AI_DONE" });
            return;
          }
          send({
            type: "response.create",
            response: {
              instructions: `${ADVISOR_PERSONA(langRef.current)} Der Kunde hat bei "${validatingQ?.category}" bestätigt, dass er/sie dies bereits genutzt hat. Stellen Sie direkt die Folgefrage: ${qText(revisitSubQ.text)} (ID: ${revisitSubQ.id}). Maximal 2 kurze Sätze. Warten Sie auf die Antwort.`,
            },
          });
          return;
        }
        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text",
            text: `[SYSTEM: Answer saved for topic "${validatingQ?.category}" (ID: ${validatingQ?.id}) — new value: "${value}". Revisit mode active. Ask warmly if the customer wants to change anything else, or is ready to see the updated product recommendation.]`,
          }]},
        });
        // Fast Mode: see the fuller note on the circle-back block above — same fix applies.
        if (fastModeRef.current && !chatOpenRef.current) {
          if (!mutedRef.current) dispatch({ type: "AI_DONE" });
          return;
        }
        send({
          type: "response.create",
          response: {
            instructions: `${ADVISOR_PERSONA(langRef.current)} Die Antwort wurde gespeichert. Fragen Sie in 1 Satz, ob der Kunde noch etwas anderes ändern möchte oder bereit ist, die aktualisierte Produktempfehlung zu sehen.`,
          },
        });
        return;
      }

      const remainingQs = remaining.map(id => questionsRef.current.find(q => q.id === id)!).filter(Boolean) as CarouselQuestion[];
      send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: remainingQs.length > 0
            ? makeNextTopicMsg(remainingQs[0], remaining.slice(1), false)
            : "[SYSTEM: All remaining topics answered. Session complete.]",
          }],
        },
      });

      dispatch({ type: "ANSWER_SAVED" });
      const nextQIdx = remaining.length > 0 ? questionsRef.current.findIndex(q => q.id === remaining[0]) : -1;
      if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
      setCard(remaining[0] ?? null);
      // Fast Mode: see the fuller note on the circle-back block above — same fix applies.
      if (fastModeRef.current && !chatOpenRef.current) {
        if (!mutedRef.current) dispatch({ type: "AI_DONE" });
        return;
      }
      send({
        type: "response.create",
        response: {
          ...(chatOpenRef.current ? { output_modalities: ["text"] as const } : {}),
          ...(remainingQs[0] ? { instructions: `${ADVISOR_PERSONA(langRef.current)} Die Antwort ist gespeichert — bewerten Sie sie inhaltlich nicht. Bestätigen Sie kurz und freundlich (variieren Sie die Formulierung) und stellen Sie dann die Frage zum Thema ${remainingQs[0].category} (ID: ${remainingQs[0].id}). ${qText(remainingQs[0].text)} Maximal 2 kurze Sätze. Sagen Sie nie „Weiter" oder „Nächste Frage". Fragen Sie NUR nach ${remainingQs[0].category} (ID: ${remainingQs[0].id}). Warten Sie auf die Antwort.` } : {}),
        },
      });
      return;
    }

    if (name === "explain_topic") {
      // Sustainability modal is open — answer verbally, never open the Phase 1 explain overlay
      if (termsSubStepRef.current === 'sustainabilityTerms') {
        sendResult({ success: false, reason: "Sustainability disclosure is open — explain this topic verbally in your audio response, do not open an overlay." });
        send({ type: "response.create" });
        return;
      }
      // Phase 2 product page — answer verbally, never open the Phase 1 explain overlay
      if (voicePhaseRef.current === 2) {
        sendResult({ success: false, reason: "Product phase is showing — explain this topic verbally in your audio response, do not open an overlay." });
        send({ type: "response.create" });
        return;
      }
      // Chat modal is open — explain inline in text, never open the overlay
      if (chatOpenRef.current) {
        sendResult({ success: false, reason: "Chat is open — do not open the explanation overlay. Explain the topic directly in your text response instead." });
        send({ type: "response.create", response: { output_modalities: ["text"] } });
        return;
      }
      const { title, keyPoints } = JSON.parse(argsJson) as {
        title:      string;
        keyPoints?: string[];
      };
      setExplainOverlayData({
        title:     title ?? "",
        keyPoints: Array.isArray(keyPoints) ? keyPoints : [],
      });
      // Track which question triggered this explanation so we know to re-ask with context on return
      if (activeCardIdRef.current) explainedQuestionsRef.current.add(activeCardIdRef.current);
      sendResult({ success: true });
      send({ type: "response.create" });
      return;
    }

    if (name === "close_explanation") {
      // Every explanation overlay (general or KB) now closes automatically once its audio
      // finishes — see private-documents/after-demo/VOICE_EXPLAIN_OVERLAY_FIX_PLAN.md.
      sendResult({ success: false, reason: "Do not call close_explanation — the overlay closes automatically when you finish speaking." });
      return;
    }

    if (name === "navigate") {
      if (explainOpenRef.current) {
        sendResult({ success: false, reason: "Explanation overlay is open — navigation blocked" });
        return;
      }
      if (termsSubStepRef.current === 'sustainabilityTerms') {
        sendResult({ success: false, reason: "Sustainability disclosure is open — navigation is blocked until the customer confirms" });
        return;
      }
      const { direction, questionId: targetId } = args;

      if (targetId) {
        // ── Mode 1: jump directly to a specific question by ID ────────
        const targetQ   = questionsRef.current.find(q => q.id === targetId);
        const targetIdx = targetQ ? questionsRef.current.findIndex(q => q.id === targetId) : -1;

        if (targetQ && targetIdx >= 0) {
          // If previously skipped, unmark it — customer is now revisiting it to answer.
          skippedIdsRef.current.delete(targetId);
          dispatch({ type: "SET_INDEX", index: targetIdx });
          setCard(targetId);
          sendResult({ success: true, jumped_to_id: targetId, jumped_to_name: targetQ.category });

          const savedAnswer = savedAnswersRef.current[targetId];
          const msg = savedAnswer
            ? `[SYSTEM: Customer navigated directly to topic "${targetQ.category}". Their previous answer was "${savedAnswer}". SPEAK NOW — ask warmly whether they want to change it. Do NOT call navigate() again.]`
            : `[SYSTEM: Customer navigated directly to topic "${targetQ.category}" which has not been answered yet. SPEAK NOW — ask it naturally. Do NOT call navigate() again.]`;

          send({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text", text: msg }] },
          });
        } else {
          sendResult({ success: false, reason: "Question ID not found" });
        }
      } else if (direction === "next") {
        // ── Mode 2: skip current question forward ─────────────────────
        // If a button skip is already in progress, the carousel was already advanced.
        // Send the expected post-navigate SYSTEM message so the AI knows what to say,
        // but do NOT send response.create — the button's response.create drives this turn.
        if (skipInProgressRef.current) {
          const remaining = questionsRef.current.filter(
            q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id) && isAskableNow(q, questionsRef.current, savedAnswersRef.current)
          );
          const nextSkipQ = remaining[0] ?? null;
          sendResult(nextSkipQ ? {
            success: true,
            next_topic_id: nextSkipQ.id,
            next_topic_name: nextSkipQ.category,
            remaining_ids_after_next: remaining.slice(1).map(q => q.id),
            instruction: `Ask about "${nextSkipQ.category}" (ID: ${nextSkipQ.id}) NOW.`,
          } : { success: true, all_topics_covered: true });
          send({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text",
              text: nextSkipQ ? makeNextTopicMsg(nextSkipQ, remaining.slice(1).map(q => q.id), true) : "[SYSTEM: All topics covered.]",
            }]},
          });
          return;
        }
        const currentQ = questionsRef.current.find(q => q.id === activeCardIdRef.current)
          ?? questionsRef.current[stateRef.current.currentQuestionIndex];

        // Q2 is a legal requirement — customer must see sustainability info before Q3,
        // even if they try to skip. Mirror the same guard in skipQuestion(). Never re-shown
        // during revisit — reaching revisit means Phase 1 already completed once.
        if (currentQ?.questionOrder === 2 && !isRevisitingRef.current && !sustainabilityConfirmedRef.current) {
          skippedIdsRef.current.add(currentQ.id); // keep remaining filter consistent — circles back at end
          setTermsSubStep('sustainabilityTerms');
          termsSubStepRef.current = 'sustainabilityTerms';
          saveVoiceState(questionsRef.current.findIndex(q => q.id === currentQ?.id)).catch(() => {});
          sendResult({ success: true });
          // Fast Mode: same gate as the direct-answer path above — neutral context only, no
          // intro narration, AI_DONE correction. This branch (reached via a voice-driven
          // navigate("next") skip of Q2) was missed when Fast Mode was first built. See
          // private-documents/after-demo/PRIORITY_FIXES_3RD_FEEDBACK_PLAN.md.
          if (fastModeRef.current && !chatOpenRef.current) {
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

        // If the current card is already answered, this is a confirm-advance (customer confirmed
        // their existing answer while back-navigated), NOT a skip. Don't mark it skipped.
        const isConfirmAdvance = currentQ != null && answeredIdsRef.current.has(currentQ.id);
        if (currentQ && !isConfirmAdvance) {
          skippedIdsRef.current.add(currentQ.id);
          skipInProgressRef.current = true;
          useVoiceSessionStore.getState().markSkipped(currentQ.id);
        }

        const remaining = questionsRef.current.filter(
          q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id) && isAskableNow(q, questionsRef.current, savedAnswersRef.current)
        );
        const nextQ    = remaining[0] ?? null;
        const nextQIdx = nextQ ? questionsRef.current.findIndex(q => q.id === nextQ.id) : -1;

        if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
        setCard(nextQ?.id ?? null);
        saveVoiceState(nextQIdx >= 0 ? nextQIdx : 0).catch(() => {});

        sendResult(nextQ ? {
          success: true,
          next_topic_id: nextQ.id,
          next_topic_name: nextQ.category,
          remaining_ids_after_next: remaining.slice(1).map(q => q.id),
          instruction: `Ask about "${nextQ.category}" (ID: ${nextQ.id}) NOW. This is the only correct next topic.`,
        } : { success: true, all_topics_covered: true });

        send({
          type: "conversation.item.create",
          item: {
            type: "message", role: "user",
            content: [{ type: "input_text", text: nextQ ? makeNextTopicMsg(nextQ, remaining.slice(1).map(q => q.id), true) : "[SYSTEM: All topics covered.]" }],
          },
        });

        // Fast Mode: context above stays updated so an on-demand PTT question still has it, but
        // skip the auto-narration itself — mirrors handleNavigation.ts's handleSkipQuestion (the
        // tap-button equivalent), which was already gated. This voice-driven general skip case
        // (customer says "skip"/"next" — not the Q2-specific branch above) was missed when Fast
        // Mode was first built. See private-documents/after-demo/PRIORITY_FIXES_3RD_FEEDBACK_PLAN.md.
        if (fastModeRef.current && !chatOpenRef.current) {
          if (!mutedRef.current) dispatch({ type: "AI_DONE" });
          return;
        }
        send({
          type: "response.create",
          response: {
            ...(chatOpenRef.current ? { output_modalities: ["text"] as const } : {}),
            ...(nextQ ? {
              instructions: isConfirmAdvance
                ? `${ADVISOR_PERSONA(langRef.current)} Der Kunde hat seine vorherige Antwort bestätigt und möchte weitermachen. Stellen Sie direkt die Frage zum Thema ${nextQ.category} (ID: ${nextQ.id}) — keine Bestätigungsfloskel davor. ${qText(nextQ.text)} Maximal 2 kurze Sätze. Fragen Sie NUR nach ${nextQ.category} (ID: ${nextQ.id}). Warten Sie auf die Antwort.`
                : `${ADVISOR_PERSONA(langRef.current)} Der Kunde hat das Thema übersprungen. Stellen Sie direkt die Frage zum Thema ${nextQ.category} (ID: ${nextQ.id}) — keine Bestätigungsfloskel davor. ${qText(nextQ.text)} Maximal 2 kurze Sätze. Fragen Sie NUR nach ${nextQ.category} (ID: ${nextQ.id}). Warten Sie auf die Antwort.`,
            } : {}),
          },
        });
        return;
      } else if (direction === "prev") {
        // ── Mode 3: step back one question ────────────────────────────
        // If a button prev is already in progress, the carousel was already stepped back.
        // Send the expected post-navigate SYSTEM message so the AI knows what to say,
        // but do NOT send response.create — the button's response.create drives this turn.
        if (prevInProgressRef.current) {
          const curIdx  = activeCardIdRef.current
            ? questionsRef.current.findIndex(q => q.id === activeCardIdRef.current)
            : stateRef.current.currentQuestionIndex;
          const curQ    = questionsRef.current[curIdx];
          const saved   = curQ ? savedAnswersRef.current[curQ.id] : undefined;
          sendResult({ success: true });
          send({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text",
              text: saved
                ? `[SYSTEM: Customer navigated back to topic "${curQ?.category}". Their previous answer was "${saved}". Ask warmly whether they want to change it. If they give a new answer, call submit_answer. If they confirm the existing answer and want to move on, call navigate("next") to advance the carousel — do NOT start talking about the next topic without calling navigate("next") first.]`
                : `[SYSTEM: Customer navigated back to topic "${curQ?.category}" which has not been answered yet. Ask it naturally. If they answer, call submit_answer. If they want to move on without answering, call navigate("next").]`,
            }]},
          });
          return;
        }
        // Use activeCardIdRef — currentQuestionIndex can drift after button skips.
        const currentIdx   = activeCardIdRef.current
          ? questionsRef.current.findIndex(q => q.id === activeCardIdRef.current)
          : stateRef.current.currentQuestionIndex;
        // Step back past conditional sub-questions the parent's answer rules
        // out (mirrors handlePrev — back from Q13 lands on Q12, not 12.1).
        let prevIndex = Math.max(0, currentIdx - 1);
        while (prevIndex > 0 && !isAskableNow(questionsRef.current[prevIndex], questionsRef.current, savedAnswersRef.current)) {
          prevIndex -= 1;
        }
        const prevQuestion = questionsRef.current[prevIndex];

        dispatch({ type: "SET_INDEX", index: prevIndex });
        setCard(prevQuestion?.id ?? null);
        sendResult({ success: true });

        const prevAnswer = prevQuestion ? savedAnswersRef.current[prevQuestion.id] : undefined;
        const msg = prevAnswer
          ? `[SYSTEM: Customer navigated back to topic "${prevQuestion.category}". Their previous answer was "${prevAnswer}". Ask warmly whether they want to change it. If they give a new answer, call submit_answer. If they confirm the existing answer and want to move on, call navigate("next") to advance the carousel — do NOT start talking about the next topic without calling navigate("next") first.]`
          : `[SYSTEM: Customer navigated back to topic "${prevQuestion?.category}" which has not been answered yet. Ask it naturally. If they answer, call submit_answer. If they want to move on without answering, call navigate("next").]`;

        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text", text: msg }] },
        });
        // Fast Mode: context above stays updated so an on-demand PTT question still has it, but
        // skip the auto-narration itself — mirrors handleNavigation.ts's handlePrev (the
        // tap-button equivalent), which was already gated. This voice-driven "go back" case
        // (customer says "go back" — not a button tap) was missed when Fast Mode was first
        // built. See private-documents/after-demo/PRIORITY_FIXES_3RD_FEEDBACK_PLAN.md.
        if (fastModeRef.current && !chatOpenRef.current) {
          if (!mutedRef.current) dispatch({ type: "AI_DONE" });
          return;
        }
        send({
          type: "response.create",
          response: {
            ...(chatOpenRef.current ? { output_modalities: ["text"] as const } : {}),
            ...(prevQuestion ? {
              instructions: prevAnswer
                ? `${ADVISOR_PERSONA(langRef.current)} Der Kunde möchte zurück zu Thema „${prevQuestion.category}" (ID: ${prevQuestion.id}). Seine bisherige Antwort war „${prevAnswer}". Fragen Sie in 1 Satz, ob er sie ändern möchte — beginnen Sie direkt mit der Frage, keine Bestätigungsfloskel davor.`
                : `${ADVISOR_PERSONA(langRef.current)} Der Kunde möchte zurück zu Thema „${prevQuestion.category}" (ID: ${prevQuestion.id}), das übersprungen wurde und noch keine Antwort hat. ${qText(prevQuestion.text)} Maximal 2 Sätze.`,
            } : {}),
          },
        });
        return;
      } else {
        sendResult({ success: false, reason: "Unknown navigate parameters" });
      }

      send({
        type: "response.create",
        ...(chatOpenRef.current ? { response: { output_modalities: ["text"] } } : {}),
      });
      return;
    }

    if (name === "confirm_product") {
      sendResult({ success: true });
      if (voicePhaseRef.current === 1) {
        // Customer is done revisiting Phase 1 and wants to see the product — go to Phase 2
        await advancePhase();
      } else {
        // Customer verbally confirmed the product — same Phase 2→3 transition as the tap
        // button (privacy-pause announcement, then silent Personal Info). No stopAudio()
        // needed here: this fires from response.done, so the response that carried this
        // function call has already finished — there is no active response to cancel.
        advanceToPersonalInfo();
      }
      return;
    }

    if (name === "navigate_back") {
      sendResult({ success: true });
      // Ignore the AI "echoing" a back-nav system message by reflexively calling navigate_back
      // right after a programmatic back step — that would over-shoot by one phase (e.g. P5→P4
      // then straight to P3). suppressNavBackRef is set by every back fn and cleared on the next
      // real user action (startPTT). See useVoiceSession.ts.
      if (suppressNavBackRef.current) return;
      // One phase back, dispatched by current phase. Only the voice-connected phases (4/5/6)
      // can reach this tool — Personal Info (3) and Signing (7) are silent, so their back is
      // button-only. See private-documents/back-navigation/PHASE_BACK_NAVIGATION_PLAN.md.
      if (voicePhaseRef.current === 4)      backToPersonalInfo();
      else if (voicePhaseRef.current === 5) backToInvestment();
      else if (voicePhaseRef.current === 6) backToContracts();
      return;
    }

    if (name === "confirm_investment") {
      sendResult({ success: true });
      // Same rationale as confirm_product above: fires from response.done, so the response
      // carrying this call has already finished — no active response to cancel.
      await confirmInvestment();
      return;
    }

    if (name === "confirm_contracts") {
      sendResult({ success: true });
      confirmContracts();
      return;
    }

    if (name === "confirm_ready_to_sign") {
      sendResult({ success: true });
      confirmReadyToSign();
      return;
    }

    if (name === "set_language") {
      const lang = args.language as "de" | "en";
      langRef.current = lang;
      sendResult({ success: true, language: lang });
      send({ type: "response.create" });
      return;
    }

    if (name === "search_document") {
      const { query } = args;
      if (!query) { sendResult({ error: "query is required" }); return; }

      const vectorStoreId = pttVectorStoreRef.current;
      if (!vectorStoreId) {
        sendResult({ error: "No vector store configured." });
        send({
          type: "response.create",
          response: {
            instructions: `You are Digital Onboarding Guide. The document search system is not configured. Apologize briefly and let the customer know you cannot search the document right now. ${langTag()}`,
          },
        });
        return;
      }

      try {
        const res = await fetch("/api/documents/search", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, vectorStoreId }),
        });
        const { results } = await res.json() as { results: string };

        if (!results || results.trim() === "" || results === "No relevant content found.") {
          sendResult({ results: "No relevant content found in the document." });
          send({
            type: "response.create",
            response: {
              instructions: `You are Digital Onboarding Guide. The document search returned no results for this question. Let the customer know you could not find that specific information in the document, and invite them to ask another question or contact support. ${langTag()}`,
            },
          });
          return;
        }

        sendResult({ results });
        send({
          type: "response.create",
          response: {
            instructions: `You are Digital Onboarding Guide. The document search returned the following content:\n\n${results}\n\nUsing ONLY the above content, answer the customer's question in 2–3 clear and natural sentences. Do not add information from your training data or memory. If the results do not directly answer the question, say so honestly and suggest they ask another question. ${langTag()}`,
          },
        });
      } catch {
        sendResult({ error: "Search failed." });
        send({
          type: "response.create",
          response: {
            instructions: `You are Digital Onboarding Guide. The document search failed due to a technical error. Apologize briefly and suggest the customer try again or contact support. ${langTag()}`,
          },
        });
      }
      return;
    }

    if (name === "revisit_questions") {
      sendResult({ success: true });
      isRevisitingRef.current = true;
      setIsRevisiting_internal(true);
      // Snap carousel to first main question — safe landing instead of Q13.1 or wherever Phase 2 left off
      const firstMainQ = questionsRef.current.find(
        q => q.questionOrder === undefined || q.questionOrder % 1 === 0
      ) ?? questionsRef.current[0];
      if (firstMainQ) setCard(firstMainQ.id);
      setVoicePhase(1);
      setProductSuggestion(null);
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: "[SYSTEM: Customer wants to revisit Phase 1. Ask which topic they want to change. IMPORTANT — when the customer names a topic: (1) call navigate({ questionId: '<exact ID from the question list>' }) FIRST to move the on-screen card, THEN ask the question verbally. When they re-answer, call submit_answer as normal. The customer may change multiple answers. Once they say they are done or want to see the updated product recommendation, call confirm_product().]",
        }]},
      });
      // Fast Mode: context above stays updated so an on-demand PTT question still has it, but
      // skip the auto-narration itself. fastModeRef isn't reset on phase transitions, so a
      // customer who enabled it in Phase 1 and asked by voice to revisit from Phase 2 still has
      // it on here. See private-documents/after-demo/PHASE_1_FAST_MODE_PLAN.md.
      if (fastModeRef.current) return;
      send({
        type: "response.create",
        response: {
          instructions: `${ADVISOR_PERSONA(langRef.current)} Fragen Sie in 1 Satz, welches Thema der Kunde ändern möchte.`,
        },
      });
      return;
    }
  } catch (err) {
    console.error("[voice] Function call error:", name, err);
  }
}
