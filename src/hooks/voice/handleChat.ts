import type { VoiceContext } from "./voiceContext";

/** Called when the chat modal opens or closes. Silences audio on open; on close with queued answers,
 *  resets the audio buffer and sends one consolidated re-prompt so the AI speaks once. */
export function handleNotifyChatOpen(open: boolean, ctx: VoiceContext): void {
  const {
    chatOpenRef, chatAnsweredRef, pendingVoiceTranscriptRef, gainRef, mutedRef,
    serverResponseActiveRef, audioCtxRef, nextPlayTimeRef, questionsRef,
    answeredIdsRef, skippedIdsRef, activeCardIdRef, langRef, voicePhaseRef,
    setIsChatAITyping, dispatch, send,
  } = ctx;

  const langTag = () => langRef.current === "de"
    ? `Sprechen Sie Deutsch mit formeller Anrede „Sie".`
    : `English only.`;
  const qText = (text: string) => langRef.current === "de"
    ? `Fragen Sie nach dem Thema auf Deutsch — formulieren Sie es gesprächig, lesen Sie nicht wörtlich vor: „${text}".`
    : `Translate this German question to English — conversational phrasing, not like a questionnaire: "${text}".`;

  if (open) {
    chatOpenRef.current   = true;
    chatAnsweredRef.current = 0;
    pendingVoiceTranscriptRef.current = null;
    setIsChatAITyping(false);
    if (gainRef.current) gainRef.current.gain.value = 0;
  } else {
    chatOpenRef.current = false;
    if (gainRef.current) gainRef.current.gain.value = mutedRef.current ? 0 : 1;

    // Cancel any in-flight text response before sending the new audio response.
    // Without this, response.create would error if OpenAI still has an active response
    // (e.g. user closed chat while the AI was still generating a reply).
    if (serverResponseActiveRef.current) {
      send({ type: "response.cancel" });
      serverResponseActiveRef.current = false;
    }

    // Phase 6 (Final Q&A) has no "next question" to resume — the customer just closes the
    // chat panel and goes back to PTT or the confirm button whenever they want. No
    // response.create, no interview-resume bookkeeping needed. See
    // private-documents/phase-6-final-qa/PHASE_6_TEXT_CHAT_ADDENDUM.md.
    if (voicePhaseRef.current === 6) {
      return;
    }

    // Move state to "processing" immediately so the sphere shows neutral (not green/listening)
    // during the ~1s gap before the AI starts speaking its audio response.
    // This also blocks the auto-modal from firing during the gap (modal requires state="listening").
    if (!mutedRef.current) dispatch({ type: "ANSWER_RECEIVED" });

    // Flush stale buffered audio that accumulated while gain was 0.
    if (audioCtxRef.current) nextPlayTimeRef.current = audioCtxRef.current.currentTime;

    const remainingNonSkipped = questionsRef.current.filter(
      q => !answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id)
    );
    const skippedRemaining = questionsRef.current.filter(q => skippedIdsRef.current.has(q.id));
    const currentQ         = questionsRef.current.find(q => q.id === activeCardIdRef.current);

    // The question the AI must ask next — used to pin response.create instructions.
    const nextToAsk = remainingNonSkipped.length > 0
      ? (currentQ ?? remainingNonSkipped[0])
      : skippedRemaining[0] ?? null;

    let systemText: string;
    if (chatAnsweredRef.current > 0) {
      if (remainingNonSkipped.length === 0 && skippedRemaining.length > 0) {
        // All non-skipped done — AI must circle back to skipped topics
        const skippedList = skippedRemaining.map(q => `"${q.id}" (${q.category})`).join(", ");
        systemText =
          `[SYSTEM: Customer answered ${chatAnsweredRef.current} question(s) via chat. ` +
          `All main topics covered. These topics were skipped earlier and still need answers: ` +
          `${skippedList}. The carousel is already showing the first skipped topic. ` +
          `Ask about it naturally and continue through them one by one. ` +
          `Do NOT call submit_answer — wait for the customer to answer by voice.]`;
      } else {
        const remainingIds = remainingNonSkipped.map(q => q.id).join(", ") || "none";
        const skippedPart  = skippedRemaining.length > 0
          ? ` Skipped topics to circle back to later: ${skippedRemaining.map(q => q.id).join(", ")}.`
          : "";
        systemText =
          `[SYSTEM: Customer answered ${chatAnsweredRef.current} question(s) via chat. ` +
          `Current topic: "${currentQ?.category ?? "unknown"}"` +
          (currentQ ? ` (ID: ${currentQ.id})` : "") + `. ` +
          `Remaining topic IDs (in order): ${remainingIds}.` +
          `${skippedPart} Resume naturally from the current topic. ` +
          `Do NOT call submit_answer — wait for the customer to answer by voice.]`;
      }
    } else {
      // User had a text conversation (questions, clarifications) but answered nothing formally.
      const currentTopic = nextToAsk
        ? `"${nextToAsk.category}" (ID: ${nextToAsk.id})`
        : "the current topic";
      systemText =
        `[SYSTEM: The customer was asking questions via text chat and has now returned to voice. ` +
        `Resume the voice advisory interview from ${currentTopic}. ` +
        `Do NOT call submit_answer — wait for the customer to answer by voice.]`;
    }

    send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text: systemText }]},
    });
    send({
      type: "response.create",
      response: nextToAsk ? {
        // No welcome-back preamble — just pick up naturally where the session left off.
        // The customer knows they closed chat; no ceremony needed.
        instructions: `You are PecunAI — a warm investment advisor. ${langTag()} Continue the voice interview naturally — no preamble or welcome-back line. Ask directly about ${nextToAsk.category} (ID: ${nextToAsk.id}). ${qText(nextToAsk.text)} Maximum 1–2 sentences. Do NOT call submit_answer — wait for the customer to respond by voice.`,
      } : {},
    });
  }
}
