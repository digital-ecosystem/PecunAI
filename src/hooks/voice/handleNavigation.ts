import { useVoiceSessionStore } from "@/store/voiceSessionStore";
import type { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import { SUSTAINABILITY_EXPLAIN_INSTRUCTIONS, makeNextTopicMsg } from "./prompts";
import type { VoiceContext } from "./voiceContext";

export function handlePrev(ctx: VoiceContext): void {
  const {
    activeCardIdRef, questionsRef, stateRef, savedAnswersRef, prevInProgressRef,
    chatOpenRef, langRef,
    dispatch, setCard, send,
  } = ctx;

  const langTag = () => langRef.current === "de"
    ? `Sprechen Sie Deutsch mit formeller Anrede „Sie".`
    : `English only.`;
  const qText = (text: string) => langRef.current === "de"
    ? `Fragen Sie nach dem Thema auf Deutsch — formulieren Sie es gesprächig, lesen Sie nicht wörtlich vor: „${text}".`
    : `Translate this German question to English — conversational phrasing, not like a questionnaire: "${text}".`;

  // Derive current position from activeCardIdRef — the true carousel source of truth.
  // currentQuestionIndex can drift stale after button skips (which don't always dispatch SET_INDEX).
  const currentIdx = activeCardIdRef.current
    ? questionsRef.current.findIndex(q => q.id === activeCardIdRef.current)
    : stateRef.current.currentQuestionIndex;
  if (currentIdx <= 0) return;
  const prevIndex = currentIdx - 1;
  const prevQuestion = questionsRef.current[prevIndex];
  // Mark button nav in progress so navigate("prev") from the AI doesn't step back again.
  prevInProgressRef.current = true;
  dispatch({ type: "SET_INDEX", index: prevIndex });
  setCard(questionsRef.current[prevIndex]?.id ?? null);

  const prevAnswer = prevQuestion ? savedAnswersRef.current[prevQuestion.id] : undefined;
  const msg = prevAnswer
    ? `[SYSTEM: Customer navigated back to topic "${prevQuestion.category}". Their previous answer was "${prevAnswer}". Ask warmly whether they want to change it. If they give a new answer, call submit_answer. If they confirm the existing answer and want to move on, call navigate("next") to advance the carousel — do NOT start talking about the next topic without calling navigate("next") first.]`
    : `[SYSTEM: Customer navigated back to topic "${prevQuestion?.category}" which has not been answered yet. Ask it naturally. If they answer, call submit_answer. If they want to move on without answering, call navigate("next").]`;

  send({
    type: "conversation.item.create",
    item: { type: "message", role: "user", content: [{ type: "input_text", text: msg }] },
  });
  send({
    type: "response.create",
    response: prevQuestion ? {
      instructions: prevAnswer
        ? `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat zurücknavigiert zu Thema „${prevQuestion.category}" (ID: ${prevQuestion.id}). Seine bisherige Antwort war „${prevAnswer}". Fragen Sie warmherzig in 1–2 Sätzen, ob er sie ändern möchte. Warten Sie auf die Antwort.`
        : `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat zurücknavigiert zu Thema „${prevQuestion.category}" (ID: ${prevQuestion.id}), das übersprungen wurde und noch keine Antwort hat. ${qText(prevQuestion.text)} Maximal 2 Sätze. Warten Sie auf die Antwort.`,
    } : {},
  });
}

export function handleSkipQuestion(question: CarouselQuestion, ctx: VoiceContext): void {
  const {
    skipInProgressRef, questionsRef, answeredIdsRef, skippedIdsRef, activeCardIdRef,
    sustainabilityConfirmedRef, termsSubStepRef, chatOpenRef, langRef,
    dispatch, setCard, saveVoiceState, send, setTermsSubStep,
  } = ctx;

  const langTag = () => langRef.current === "de"
    ? `Sprechen Sie Deutsch mit formeller Anrede „Sie".`
    : `English only.`;
  const qText = (text: string) => langRef.current === "de"
    ? `Fragen Sie nach dem Thema auf Deutsch — formulieren Sie es gesprächig, lesen Sie nicht wörtlich vor: „${text}".`
    : `Translate this German question to English — conversational phrasing, not like a questionnaire: "${text}".`;

  if (skipInProgressRef.current) return; // block until AI finishes and session returns to "listening"
  skipInProgressRef.current = true;

  // Q2 is the sustainability acknowledgment — show the disclosure on first encounter (legal requirement).
  // If already confirmed this session (sustainabilityConfirmedRef), skip the modal and let the
  // normal skip flow handle Q2 like any other question.
  if (question.questionOrder === 2 && !sustainabilityConfirmedRef.current) {
    skippedIdsRef.current.add(question.id); // keep remaining filter consistent — circles back at end
    setTermsSubStep('sustainabilityTerms');
    termsSubStepRef.current = 'sustainabilityTerms';
    saveVoiceState(questionsRef.current.findIndex(q => q.id === question.id)).catch(() => {});
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: "[SYSTEM: PHASE 1 PAUSED. The sustainability disclosure document is now displayed on screen. STOP asking Phase 1 questions. Introduce this document (1–2 sentences), tell the customer to read it and tap confirm, mention they can hold the microphone button to ask questions about it. Then STOP — do not speak further until they confirm.]",
      }]},
    });
    send({ type: "response.create", response: { instructions: SUSTAINABILITY_EXPLAIN_INSTRUCTIONS(langRef.current) } });
    return;
  }

  skippedIdsRef.current.add(question.id);
  useVoiceSessionStore.getState().markSkipped(question.id);

  // Use the same remaining algorithm as navigate("next") — not raw index+1,
  // which could land on an already-answered or already-skipped slot.
  const remaining = questionsRef.current.filter(
    q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id)
  );
  const nextQ    = remaining[0] ?? null;
  const nextQIdx = nextQ ? questionsRef.current.findIndex(q => q.id === nextQ.id) : -1;

  if (nextQIdx >= 0) dispatch({ type: "SET_INDEX", index: nextQIdx });
  setCard(nextQ?.id ?? null);
  saveVoiceState(nextQIdx >= 0 ? nextQIdx : 0).catch(() => {});

  send({
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: nextQ
        ? makeNextTopicMsg(nextQ, remaining.slice(1).map(q => q.id), true)
        : "[SYSTEM: All remaining topics are either answered or skipped — circle-back phase will follow.]",
      }],
    },
  });
  send({
    type: "response.create",
    response: nextQ ? {
      instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Bestätigen Sie das Überspringen in 1 natürlichen Satz (z.B. „Natürlich, kommen wir später darauf zurück!"). Leiten Sie dann natürlich zum Thema ${nextQ.category} (ID: ${nextQ.id}) über. ${qText(nextQ.text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${nextQ.category} (ID: ${nextQ.id}). Warten Sie auf die Antwort.`,
    } : {},
  });
}

export function handleRequestExplanation(ctx: VoiceContext): void {
  const { questionsRef, activeCardIdRef, stateRef, send } = ctx;

  const currentQ = questionsRef.current.find(q => q.id === activeCardIdRef.current)
    ?? questionsRef.current[stateRef.current.currentQuestionIndex];
  if (!currentQ) return;
  send({
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: `[SYSTEM: Customer tapped the info button on "${currentQ.category}". Use explain_topic to open the overlay and explain this concept clearly.]` }],
    },
  });
  send({ type: "response.create" });
}

export function handleCloseExplainOverlay(ctx: VoiceContext): void {
  const {
    mutedRef, knowledgeBlockerNextQRef, kbExplanationResponseIdRef, questionsRef,
    activeCardIdRef, explainedQuestionsRef, answeredIdsRef, langRef,
    dispatch, send, setCard, setExplainTriggerClose, setExplainOverlayData,
  } = ctx;

  const langTag = () => langRef.current === "de"
    ? `Sprechen Sie Deutsch mit formeller Anrede „Sie".`
    : `English only.`;
  const qText = (text: string) => langRef.current === "de"
    ? `Fragen Sie nach dem Thema auf Deutsch — formulieren Sie es gesprächig, lesen Sie nicht wörtlich vor: „${text}".`
    : `Translate this German question to English — conversational phrasing, not like a questionnaire: "${text}".`;

  setExplainTriggerClose(false);
  setExplainOverlayData(null);
  if (!mutedRef.current) dispatch({ type: "AI_SPEAKING" });

  // ── Knowledge-blocker path: advance carousel and ask the stored next question ──
  const kbNextQ = knowledgeBlockerNextQRef.current;
  if (kbNextQ) {
    knowledgeBlockerNextQRef.current    = null;
    kbExplanationResponseIdRef.current  = null;
    const nextIdx = questionsRef.current.findIndex(q => q.id === kbNextQ.id);
    if (nextIdx >= 0) dispatch({ type: "SET_INDEX", index: nextIdx });
    setCard(kbNextQ.id);
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: `[SYSTEM: Explanation overlay closed. Now ask the next question naturally: "${kbNextQ.text}" (ID: ${kbNextQ.id}). Wait for the customer's answer.]`,
      }]},
    });
    send({
      type: "response.create",
      response: {
        instructions: `Sie sind PecunAI. ${langTag()} Die Erklärung ist abgeschlossen. Leiten Sie natürlich zur nächsten Frage über. ${qText(kbNextQ.text)} (ID: ${kbNextQ.id}). Kurz und herzlich. Warten Sie auf die Antwort des Kunden.`,
      },
    });
    return;
  }

  const currentQ = questionsRef.current.find(q => q.id === activeCardIdRef.current);
  if (currentQ) setCard(currentQ.id);

  const wasExplained    = currentQ ? explainedQuestionsRef.current.has(currentQ.id) : false;
  const alreadyAnswered = currentQ ? answeredIdsRef.current.has(currentQ.id) : false;
  const navInstruction  = currentQ ? ` Call navigate(questionId: "${currentQ.id}") first to sync the carousel.` : "";

  let nextInstruction: string;
  if (wasExplained && currentQ && !alreadyAnswered) {
    nextInstruction = ` Then re-ask the "${currentQ.category}" question naturally with context — e.g. "Now that I've walked you through that, [original question]?" — wait for their answer and submit it.`;
  } else if (currentQ && !alreadyAnswered) {
    nextInstruction = ` Then continue naturally with the "${currentQ.category}" question.`;
  } else {
    nextInstruction = " Then resume the consultation naturally.";
  }

  send({
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: `[SYSTEM: Customer manually closed the explanation overlay.${navInstruction}${nextInstruction}]` }],
    },
  });
  send({ type: "response.create" });
}

export function handleScrollCarousel(id: string, ctx: VoiceContext): void {
  const {
    questionsRef, savedAnswersRef, isRevisitingRef, langRef,
    setCard, dispatch, send,
  } = ctx;

  const langTag = () => langRef.current === "de"
    ? `Sprechen Sie Deutsch mit formeller Anrede „Sie".`
    : `English only.`;

  const idx = questionsRef.current.findIndex(q => q.id === id);
  if (idx < 0) return;
  setCard(id);
  dispatch({ type: "SET_INDEX", index: idx });
  const q = questionsRef.current[idx];
  if (q) {
    const savedAnswer = savedAnswersRef.current[q.id];
    if (isRevisitingRef.current) {
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: `[SYSTEM: Customer navigated to topic "${q.category}" (ID: ${q.id}) using the carousel button.${savedAnswer ? ` Their saved answer was "${savedAnswer}".` : ""} Ask warmly in 1 sentence whether they want to change this answer. Wait for their response.]`,
        }]},
      });
      send({
        type: "response.create",
        response: {
          instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat auf die Navigationspfeile geklickt und ist zu "${q.category}" navigiert.${savedAnswer ? ` Ihre bisherige Antwort war "${savedAnswer}".` : ""} Fragen Sie warmherzig in 1 Satz, ob sie diese Antwort ändern möchten. Warten Sie auf ihre Antwort.`,
        },
      });
    } else {
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: `[SYSTEM: Customer browsed to topic "${q.category}" (ID: ${q.id}).${savedAnswer ? ` Their saved answer was "${savedAnswer}".` : ""} Do NOT ask about this topic yet — wait for the customer to confirm they want to change it. Stay available.]`,
        }]},
      });
    }
  }
}

export function handleRevisitQuestions(ctx: VoiceContext): void {
  const {
    questionsRef, isRevisitingRef, voicePhaseRef, langRef,
    setCard, setIsRevisiting_internal, saveVoiceState, send, setVoicePhase, setProductSuggestion,
  } = ctx;

  const langTag = () => langRef.current === "de"
    ? `Sprechen Sie Deutsch mit formeller Anrede „Sie".`
    : `English only.`;

  isRevisitingRef.current = true;
  setIsRevisiting_internal(true);
  voicePhaseRef.current   = 1;  // set ref before saveVoiceState reads it
  saveVoiceState(questionsRef.current.length).catch(() => {});  // persist isRevisiting: true + voicePhase: 1
  useVoiceSessionStore.getState().setIsRevisiting(true);        // Zustand dual-write for same-browser path
  // Snap carousel to first main question — safe landing instead of whatever Q was active in Phase 2
  const firstMainQ = questionsRef.current.find(
    q => q.questionOrder === undefined || q.questionOrder % 1 === 0
  ) ?? questionsRef.current[0];
  if (firstMainQ) setCard(firstMainQ.id);
  setVoicePhase(1);
  setProductSuggestion(null);
  send({
    type: "session.update",
    session: { type: "realtime", audio: { input: { turn_detection: { type: "semantic_vad" } } } },
  });
  send({
    type: "conversation.item.create",
    item: { type: "message", role: "user", content: [{ type: "input_text",
      text: "[SYSTEM: Customer tapped Revisit. Ask which topic they want to change. IMPORTANT — when the customer names a topic: (1) call navigate({ questionId: '<exact ID from the question list>' }) FIRST to move the on-screen card, THEN ask the question verbally. When they re-answer, call submit_answer as normal. The customer may change multiple answers. Once they say they are done or want to see the updated product recommendation, call confirm_product().]",
    }]},
  });
  send({
    type: "response.create",
    response: {
      instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde hat auf Zurück getippt. Bestätigen Sie warmherzig in 1 Satz und fragen Sie, welches Thema er ändern möchte.`,
    },
  });
}
