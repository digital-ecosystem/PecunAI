import { useVoiceSessionStore } from "@/store/voiceSessionStore";
import type { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import { SUSTAINABILITY_EXPLAIN_INSTRUCTIONS, ASSET_CLASS_OVERLAY, makeNextTopicMsg } from "./prompts";
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
    audioEndTimer, stateRef, langRef,
    dispatch, setCard, appendChatMessage, saveAnswer, saveVoiceState, advancePhase, send, router,
    setSavedAnswers, setTermsSubStep, setExplainOverlayData,
  } = ctx;

  const langTag = () => langRef.current === "de"
    ? `Sprechen Sie Deutsch mit formeller Anrede „Sie".`
    : `English only.`;
  const qText = (text: string) => langRef.current === "de"
    ? `Fragen Sie nach dem Thema auf Deutsch — formulieren Sie es gesprächig, lesen Sie nicht wörtlich vor: „${text}".`
    : `Translate this German question to English — conversational phrasing, not like a questionnaire: "${text}".`;

  dispatch({ type: "ANSWER_RECEIVED" });

  await saveAnswer(question.id, value);
  // Derive nextIndex from question position — more reliable than stateRef.
  const qIdx     = questionsRef.current.findIndex(q => q.id === question.id);
  const nextIndex = qIdx >= 0 ? qIdx + 1 : stateRef.current.currentQuestionIndex + 1;
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
  if (question.questionOrder === 2) {
    if (!sustainabilityConfirmedRef.current) {
      setTermsSubStep('sustainabilityTerms');
      termsSubStepRef.current = 'sustainabilityTerms';
      saveVoiceState(questionsRef.current.findIndex(q => q.id === question.id)).catch(() => {});
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: "[SYSTEM: PHASE 1 PAUSED. The sustainability disclosure document is now displayed on screen. STOP asking Phase 1 questions. Introduce this document (1–2 sentences), tell the customer to read it and tap confirm, mention they can hold the microphone button to ask questions about it. Then STOP — do not speak further until they confirm.]",
        }]},
      });
      send({ type: "response.create", response: { instructions: SUSTAINABILITY_EXPLAIN_INSTRUCTIONS } });
      return;
    }
    // Sustainability already confirmed — skip modal and fall through to normal advance.
  }

  // ── BLOCKER: Q3 sustainability info not received → session ends ──
  if (question.questionOrder === 3 && value === "no") {
    send({
      type: "response.create",
      response: {
        instructions: `Sie sind PecunAI. ${langTag()} Der Kunde hat angegeben, die Nachhaltigkeitsinformationen nicht erhalten zu haben. Erklären Sie in 2–3 Sätzen freundlich aber klar: Gemäß den gesetzlichen Vorschriften ist es erforderlich, dass Sie die Nachhaltigkeitsinformationen zur Kenntnis genommen haben, bevor die Beratung fortgesetzt werden kann. Wir empfehlen, sich mit einem persönlichen Berater in Verbindung zu setzen. Verabschieden Sie sich herzlich.`,
      },
    });
    setTimeout(() => router.push("/customer/dashboard"), 7000);
    return;
  }

  // ── BLOCKER: Q4 sustainability preference ────────────────────────
  if (question.questionOrder === 4 && (value === "yes" || value === "no")) {
    send({
      type: "response.create",
      response: {
        instructions: `Sie sind PecunAI. ${langTag()} Der Kunde hat eine Nachhaltigkeitspräferenz angegeben, die mit dem aktuellen Produktangebot nicht abgedeckt werden kann. Erklären Sie in 2–3 Sätzen freundlich aber klar: Aufgrund der angegebenen Nachhaltigkeitspräferenzen ist eine persönliche Beratung erforderlich — das aktuelle Produktangebot deckt diese Präferenz nicht vollständig ab. Ein Berater wird sich in Kürze bei Ihnen melden. Verabschieden Sie sich herzlich.`,
      },
    });
    setTimeout(() => router.push("/customer/dashboard"), 7000);
    return;
  }

  // ── BLOCKER: Q7 income check ─────────────────────────────────────
  if (question.questionOrder === 7) {
    const q6        = questionsRef.current.find(q => q.questionOrder === 6);
    const incomeStr = q6 ? savedAnswersRef.current[q6.id] : undefined;
    const income    = parseFloat(incomeStr ?? "0");
    const expenses  = parseFloat(value);
    if (!isNaN(income) && !isNaN(expenses) && (income - expenses) <= 150) {
      send({
        type: "response.create",
        response: {
          instructions: `Sie sind PecunAI. ${langTag()} Das verfügbare monatliche Einkommen des Kunden beträgt nach Abzug der Ausgaben weniger als 150 Euro. Erklären Sie in 2–3 Sätzen verständnisvoll: Aufgrund der angegebenen finanziellen Verhältnisse ist eine Investition zum aktuellen Zeitpunkt leider nicht empfehlenswert — das verfügbare monatliche Budget reicht für eine sinnvolle Anlage nicht aus. Eine persönliche Beratung wird empfohlen. Verabschieden Sie sich herzlich.`,
        },
      });
      setTimeout(() => router.push("/customer/dashboard"), 7000);
      return;
    }
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

  if (chatOpenRef.current) {
    chatAnsweredRef.current++;

    const allAnswered = answeredIdsRef.current.size === questionsRef.current.length;
    if (allAnswered) {
      await advancePhase();
      return;
    }

    const remainingNonSkipped = questionsRef.current.filter(
      q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id)
    );
    const skippedRemaining = questionsRef.current.filter(q => skippedIdsRef.current.has(q.id));

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

  const allAnswered            = answeredIdsRef.current.size === questionsRef.current.length;
  const allCoveredExceptSkipped = answeredIdsRef.current.size + skippedIdsRef.current.size === questionsRef.current.length;

  if (allAnswered && !isRevisitingRef.current) {
    circleBackActiveRef.current = false;
    await advancePhase();
    return;
  }

  const remaining = questionsRef.current
    .filter(q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id))
    .map(q => q.id);

  // ── KNOWLEDGE BLOCKER: Q12/13/14 "none" → open explain overlay for this asset class ──
  if (question.questionOrder !== undefined && [12, 13, 14].includes(question.questionOrder) && value === "none") {
    const overlayEntry = ASSET_CLASS_OVERLAY[question.questionOrder];
    if (overlayEntry) {
      const nextQObj = remaining
        .map(id => questionsRef.current.find(q => q.id === id))
        .filter(Boolean)[0] as CarouselQuestion | undefined;
      knowledgeBlockerNextQRef.current = nextQObj ?? null;
      kbExplanationStartedRef.current  = false;
      if (audioEndTimer.current) { clearTimeout(audioEndTimer.current); audioEndTimer.current = null; }
      dispatch({ type: "ANSWER_SAVED" });
      setExplainOverlayData(overlayEntry.data);
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text",
          text: `[SYSTEM: Explanation overlay for "${overlayEntry.data.title}" is open. Speak a 2–3 sentence verbal explanation of what ${overlayEntry.nameEn} are and why they matter for investing. Do NOT say "take a look" or reference the screen — explain verbally. The overlay closes automatically when you finish speaking.]`,
        }]},
      });
      send({
        type: "response.create",
        response: {
          instructions: `Sie sind PecunAI. ${langTag()} Das Erläuterungsfenster ist geöffnet. Erklären Sie mündlich in 2–3 einfachen, freundlichen Sätzen, was ${overlayEntry.data.title} sind und warum sie für Anleger relevant sind. Sagen Sie NICHT „schauen Sie auf den Bildschirm" und beziehen Sie sich nicht auf das Overlay. Sprechen Sie natürlich. Warten Sie danach — die Sitzung wird automatisch fortgesetzt.`,
        },
      });
      return;
    }
  }

  if (allCoveredExceptSkipped && skippedIdsRef.current.size > 0 && !isRevisitingRef.current) {
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
    send({
      type: "response.create",
      response: firstSkippedTap ? {
        instructions: isFirstCircleBackTap
          ? `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Alle Hauptthemen sind beantwortet. Leiten Sie warmherzig in 1 Satz über. Führen Sie dann natürlich zum Thema ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}) über. ${qText(firstSkippedTap.text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}). Warten Sie auf die Antwort.`
          : `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Fahren Sie natürlich mit den übersprungenen Themen fort. Führen Sie zum Thema ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}) über. ${qText(firstSkippedTap.text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${firstSkippedTap.category} (ID: ${firstSkippedTap.id}). Warten Sie auf die Antwort.`,
      } : {},
    });
    return;
  }

  dispatch({ type: "ANSWER_SAVED" });

  if (isRevisitingRef.current) {
    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text",
        text: `[SYSTEM: Answer saved for topic "${question.category}" (ID: ${question.id}) — new value: "${value}". Revisit mode is still active. Ask warmly in 1 sentence if the customer wants to change anything else, or if they are ready to see the updated product recommendation. Do NOT call submit_answer or navigate. Wait for their response.]`,
      }]},
    });
    send({
      type: "response.create",
      response: {
        instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Die Antwort wurde gespeichert. Fragen Sie warmherzig in 1 Satz: Möchte der Kunde noch etwas anderes ändern, oder ist er bereit, die aktualisierte Produktempfehlung zu sehen?`,
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
  send({
    type: "response.create",
    response: remainingQsTap[0] ? {
      instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Tun Sie genau zwei Dinge: (1) Reagieren Sie in 1 Satz auf die getippte Antwort des Kunden — etwas Echtes über seine Wahl, keine generische Überleitung. Sagen Sie nie „Weiter" oder „Nächste Frage". (2) Leiten Sie natürlich zum Thema ${remainingQsTap[0].category} (ID: ${remainingQsTap[0].id}) über. ${qText(remainingQsTap[0].text)} Maximal 2–3 Sätze. Fragen Sie NUR nach ${remainingQsTap[0].category} (ID: ${remainingQsTap[0].id}). Warten Sie auf die Antwort.`,
    } : {},
  });
}
