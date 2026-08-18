import { useVoiceSessionStore } from "@/store/voiceSessionStore";
import type { ChatMessage } from "./types";
import { buildSystemPrompt, INTRO_INSTRUCTIONS, TERMS1_EXPLAIN_INSTRUCTIONS, TERMS2_EXPLAIN_INSTRUCTIONS, SUSTAINABILITY_EXPLAIN_INSTRUCTIONS, PHASE4_REENTRY_SYSTEM_PROMPT, CONTRACT_DOCUMENT_INTRO_INSTRUCTIONS, FINAL_QA_INTRO_INSTRUCTIONS, ADVISOR_PERSONA, buildPhase4PresentationContext, PHASE4_COST_ANSWER_RULES, PHASE5_SCREEN_CONTEXT, GERMAN_SPEECH_DIRECTIVE, isAskableNow } from "./prompts";
import { TOOLS } from "./tools";
import { base64ToPCM16AudioBuffer } from "./audio";
import type { VoiceContext } from "./voiceContext";

export async function handleWsMessage(
  msg: Record<string, unknown>,
  vc:  VoiceContext,
): Promise<void> {
  const type = msg.type as string;
  if (type !== "response.output_audio.delta") {
    console.log("[voice] ←", type, type === "error" ? msg : "");
  }

  const {
    sessionConfiguredRef, initialIndexRef, micStreamRef, audioCtxRef,
    voicePhaseRef, termsSubStepRef, stateRef, chatOpenRef, pttActiveRef, mutedRef,
    explainOpenRef, serverResponseActiveRef, activeResponseIdRef, pendingCall, aiTextBufferRef, aiAudioTranscriptRef,
    lastAITranscriptRef, pendingVoiceTranscriptRef, currentSpeechItemIdRef,
    applyPendingTranscriptRef, needsTranscriptBubbleRef,
    kbExplanationStartedRef, kbExplanationResponseIdRef, isAISpeakingRef, bargeInActiveRef,
    latencyStartRef, pttSearchPendingRef, pttSpeculativeSearchRef, pttPartialTranscriptRef,
    pttVectorStoreRef, pttDocLabelRef, activeSourcesRef, nextPlayTimeRef, wsRef,
    skippedIdsRef, isRevisitingRef, langRef, micSourceRef, workletNodeRef, micAnalyserRef,
    resetExplainIdleRef, savedAnswersRef, questionsRef, fastModeRef, growNextCardRef,
    send, dispatch, scheduleChunk, scheduleAIDone, handleFunctionCall, setCard,
    setIsAISpeaking, setBargeInActive, setMicAnalyserNode, setIsChatAITyping, setChatMessages,
    appendChatMessage, appendPhase6ChatMessage,
  } = vc;

  const langTag = () => langRef.current === "de"
    ? GERMAN_SPEECH_DIRECTIVE
    : `English only.`;

  switch (type) {

    case "session.created": {
      if (voicePhaseRef.current === 4 || voicePhaseRef.current === 5 || voicePhaseRef.current === 6) {
        const reentryInstructions = voicePhaseRef.current === 4
          ? PHASE4_REENTRY_SYSTEM_PROMPT(langRef.current)
          : voicePhaseRef.current === 5
          ? CONTRACT_DOCUMENT_INTRO_INSTRUCTIONS(langRef.current)
          : FINAL_QA_INTRO_INSTRUCTIONS(langRef.current);
        send({
          type: "session.update",
          session: {
            type:              "realtime",
            model:             "gpt-realtime-1.5",
            output_modalities: ["audio"],
            instructions:      reentryInstructions,
            tools:             TOOLS,
            tool_choice:       "auto",
            audio: {
              input: {
                format: { type: "audio/pcm", rate: 24000 },
                turn_detection: null,
                transcription: { model: "gpt-4o-transcribe", language: langRef.current },
              },
              output: {
                format: { type: "audio/pcm", rate: 24000 },
                voice:  "marin",
              },
            },
          },
        });
        break;
      }

      // Use initialIndexRef (set once at mount) — guaranteed correct even if
      // the stateRef effect hasn't fired yet when this message arrives.
      // For Phase 2 resume, pass the full question count so all Qs show as "already collected".
      const resumeIdx = (voicePhaseRef.current === 2 || isRevisitingRef.current)
        ? questionsRef.current.length
        : initialIndexRef.current;
      send({
        type: "session.update",
        session: {
          type:              "realtime",
          model:             "gpt-realtime-1.5",
          output_modalities: ["audio"],
          instructions:      buildSystemPrompt(questionsRef.current, resumeIdx, skippedIdsRef.current, isRevisitingRef.current, langRef.current),
          tools:             TOOLS,
          tool_choice:       "auto",
          audio: {
            input: {
              format: { type: "audio/pcm", rate: 24000 },
              // A cold resume (browser refresh) directly into Phase 1 needs VAD off from the
              // start — the live Phase 0→1 transition disables it explicitly instead (see
              // handleTerms.ts's handleConfirmTerms2()). See
              // private-documents/after-demo/PHASE_1_PTT_PLAN.md.
              turn_detection: voicePhaseRef.current === 1 ? null : { type: "semantic_vad" },
              transcription: { model: "gpt-4o-transcribe", language: langRef.current },
            },
            output: {
              format: { type: "audio/pcm", rate: 24000 },
              voice:  "marin",
            },
          },
        },
      });
      break;
    }

    case "session.updated": {
      // Only perform initial setup once — subsequent session.updated events come from
      // mid-session session.update calls (e.g. navigation task overrides) and must be ignored.
      if (sessionConfiguredRef.current) break;
      sessionConfiguredRef.current = true;

      // Wire mic input for server VAD if permission was granted
      const mic  = micStreamRef.current;
      const actx = audioCtxRef.current;
      if (mic && actx) {
        const micSource  = actx.createMediaStreamSource(mic);
        const silentGain = actx.createGain();
        silentGain.gain.value = 0;
        const workletNode = new AudioWorkletNode(actx, "pcm-processor");

        // Tap an AnalyserNode off the mic source for sphere visualization
        const micAnalyser = actx.createAnalyser();
        micAnalyser.fftSize = 256;
        micSource.connect(micAnalyser);

        micSource.connect(workletNode);
        workletNode.connect(silentGain);
        silentGain.connect(actx.destination);
        workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          const ws = wsRef.current;
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          // Allow mic streaming during AI speech so semantic_vad can detect barge-in.
          // Block only in states where the session is not actively live.
          if (["idle", "connecting", "error", "paused", "muted"].includes(stateRef.current.session)) return;
          if (chatOpenRef.current) return;
          if (voicePhaseRef.current === 0 && !pttActiveRef.current) return;
          if (termsSubStepRef.current === 'sustainabilityTerms' && !pttActiveRef.current) return;
          if (voicePhaseRef.current === 1 && !pttActiveRef.current) return;
          if (voicePhaseRef.current === 2 && !pttActiveRef.current) return;
          if (voicePhaseRef.current === 4 && !pttActiveRef.current) return;
          if (voicePhaseRef.current === 5 && !pttActiveRef.current) return;
          if (voicePhaseRef.current === 6 && !pttActiveRef.current) return;
          const bytes = new Uint8Array(e.data);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: btoa(binary) }));
        };
        micSourceRef.current   = micSource;
        workletNodeRef.current = workletNode;
        micAnalyserRef.current = micAnalyser;
        setMicAnalyserNode(micAnalyser);
      }
      // Session configured — trigger AI speech, branching on phase
      if (voicePhaseRef.current === 4 || voicePhaseRef.current === 5 || voicePhaseRef.current === 6) {
        send({ type: "response.create" });
      } else if (voicePhaseRef.current === 0 && termsSubStepRef.current === 'terms2') {
        // Resume: customer already confirmed terms1 — go straight to terms2 explanation
        send({ type: "response.create", response: { instructions: TERMS2_EXPLAIN_INSTRUCTIONS(langRef.current) } });
      } else if (voicePhaseRef.current === 0 && termsSubStepRef.current === 'terms1') {
        // Customer tapped "skip" during the tap-to-start → session.updated window, before the
        // intro create was ever sent (handleMoveToTerms1 deferred it here to avoid a duplicate-
        // create collision). The intro is gone; send the terms1 narration directly. See
        // PHASE_0_INTRO_SKIP_RACE_PLAN.md.
        send({ type: "response.create", response: { instructions: TERMS1_EXPLAIN_INSTRUCTIONS(langRef.current) } });
      } else if (voicePhaseRef.current === 0 && termsSubStepRef.current === 'intro') {
        // Fresh start: welcome intro before terms. Mark the request so an
        // intro-skip landing before this response is even born can still be
        // sequenced correctly — see PHASE_0_INTRO_SKIP_RACE_PLAN.md.
        vc.awaitingResponseCreatedRef.current = true;
        send({ type: "response.create", response: { instructions: INTRO_INSTRUCTIONS(langRef.current) } });
      } else if (voicePhaseRef.current === 2) {
        // Phase 2 resume — re-inject product context and greet back
        const product = vc.productRef.current;
        if (product) {
          const durationQ      = questionsRef.current.find(q => q.questionOrder === 2);
          const riskQ          = questionsRef.current.find(q => q.questionOrder === 5);
          const durationAnswer = durationQ ? savedAnswersRef.current[durationQ.id] : undefined;
          const riskAnswer     = riskQ     ? savedAnswersRef.current[riskQ.id]     : undefined;
          const productPrompt  = (product.aiSettings?.prompt ?? "").slice(0, 3000);
          const systemMsg = [
            `[SYSTEM: Resuming Phase 2 — Product Suggestion. Recommended portfolio: "${product.fullName}".`,
            `Customer's investment horizon: ${durationAnswer ?? "unknown"}. Risk tolerance: ${riskAnswer ?? "unknown"}.`,
            `Product knowledge base:\n${productPrompt}`,
            `Your role: welcome the customer back warmly, briefly recap the recommended portfolio and why it fits them,`,
            `invite questions or ask them to confirm to proceed.`,
            `When customer confirms: call confirm_product(). If they want to revisit questions: call revisit_questions().]`,
          ].join("\n");
          send({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text", text: systemMsg }] },
          });
          const durationLabel = durationAnswer ?? `${product.from}–${product.to} Jahren`;
          send({
            type: "response.create",
            response: {
              instructions: [
                ADVISOR_PERSONA(langRef.current),
                `Die Sitzung wird fortgesetzt. Begrüßen Sie den Kunden kurz zurück in 1 Satz.`,
                `Empfehlen Sie dann kurz das Portfolio "${product.fullName}" — nennen Sie NIEMALS den internen Code "${product.name}".`,
                `Erinnern Sie in 1–2 Sätzen, warum es empfohlen wurde (Horizont: ${durationLabel}, Risiko: ${riskAnswer ?? product.risk}).`,
                `Laden Sie zu Fragen ein oder fragen Sie, ob der Kunde fortfahren möchte. Maximal 3 Sätze gesamt.`,
              ].join(" "),
            },
          });
        } else {
          // Product not loaded yet (refetch slow) — bare greeting, AI will pick up from context
          send({ type: "response.create" });
        }
      } else if (termsSubStepRef.current === 'sustainabilityTerms') {
        // Resume: sustainability modal was showing when session was interrupted
        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text",
            text: "[SYSTEM: PHASE 1 PAUSED. The sustainability disclosure document is displayed on screen. The customer returned to the session. Greet them back warmly in 1 sentence, mention they can continue reading the sustainability document and tap confirm when ready, and that they can hold the mic button to ask questions. Do NOT ask any Phase 1 questions. Wait for them to confirm.]",
          }]},
        });
        // Fast Mode: keep the context update (grounds on-demand PTT) but skip the spoken
        // greeting — resume greetings weren't gated when Fast Mode was first built, since Fast
        // Mode didn't yet exist on this path. See
        // private-documents/after-demo/PRIORITY_FIXES_3RD_FEEDBACK_PLAN.md.
        if (fastModeRef.current) {
          if (!mutedRef.current) dispatch({ type: "AI_DONE" });
        } else {
          send({ type: "response.create", response: { instructions: `${ADVISOR_PERSONA(langRef.current)} Der Kunde ist zurückgekehrt und sieht das Nachhaltigkeitsdokument. Begrüßen Sie ihn kurz in 1 Satz, erinnern Sie ihn daran, dass er das Dokument in seinem eigenen Tempo lesen und auf „Ich bestätige" tippen kann, und dass er die Mikrofontaste halten kann, um Fragen zu stellen. Stellen Sie KEINE Phase-1-Fragen. Warten Sie.` } });
        }
      } else if (
        voicePhaseRef.current === 1 && !isRevisitingRef.current &&
        skippedIdsRef.current.size > 0 &&
        questionsRef.current.filter(q =>
          !vc.answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id) &&
          isAskableNow(q, questionsRef.current, savedAnswersRef.current)
        ).length === 0
      ) {
        const allSkipped   = questionsRef.current.filter(q => skippedIdsRef.current.has(q.id));
        const firstSkipped = allSkipped[0];
        const skippedIdx   = questionsRef.current.findIndex(q => q.id === firstSkipped.id);
        if (skippedIdx >= 0) dispatch({ type: "SET_INDEX", index: skippedIdx });
        setCard(firstSkipped.id);
        vc.circleBackActiveRef.current = true; // preamble is in the instruction below; don't repeat it per-question
        const qText = (text: string) => langRef.current === "de"
          ? `Fragen Sie nach dem Thema auf Deutsch — formulieren Sie es gesprächig, lesen Sie nicht wörtlich vor: „${text}".`
          : `Translate this German question to English — conversational phrasing, not like a questionnaire: "${text}".`;
        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text",
            text: `[SYSTEM: Session resumed. All main topics are answered. Now circle back through ${allSkipped.length} skipped topic(s). Your ONLY next topic is "${firstSkipped.category}" (ID: ${firstSkipped.id}). Ask about this now. Remaining skipped after this: ${allSkipped.slice(1).map(q => q.id).join(", ") || "none"}.]`,
          }]},
        });
        if (fastModeRef.current) {
          growNextCardRef.current = true;
          if (!mutedRef.current) dispatch({ type: "AI_DONE" });
        } else {
          send({
            type: "response.create",
            response: {
              instructions: `${ADVISOR_PERSONA(langRef.current)} Willkommen zurück. Alle Hauptthemen sind beantwortet. Sagen Sie in 1 Satz sachlich, dass Sie noch auf die zurückgestellten Themen zurückkommen, und stellen Sie dann die Frage zum Thema ${firstSkipped.category} (ID: ${firstSkipped.id}). ${qText(firstSkipped.text)} Maximal 2 Sätze. Fragen Sie NUR nach ${firstSkipped.category} (ID: ${firstSkipped.id}). Warten Sie auf die Antwort.`,
            },
          });
        }
      } else if (voicePhaseRef.current === 1 && fastModeRef.current) {
        growNextCardRef.current = true;
        if (!mutedRef.current) dispatch({ type: "AI_DONE" });
      } else {
        // Phase 1 (skip mode or after confirmTerms2) — normal greeting
        send({ type: "response.create" });
      }
      break;
    }

    case "response.output_audio.delta": {
      {
        const responseId = (msg as { response_id?: string }).response_id;
        if (activeResponseIdRef.current === null || (responseId && responseId !== activeResponseIdRef.current)) break;
      }
      if (explainOpenRef.current) {
        const responseId = (msg as { response_id?: string }).response_id;
        if (responseId === kbExplanationResponseIdRef.current) {
          kbExplanationStartedRef.current = true;
        }
      }
      // New AI audio arriving — barge-in processing is complete, re-enable auto-modal.
      if (bargeInActiveRef.current) {
        bargeInActiveRef.current = false;
        setBargeInActive(false);
      }
      if (!isAISpeakingRef.current) {
        isAISpeakingRef.current = true;
        setIsAISpeaking(true);
        if (latencyStartRef.current) {
          console.log(`[latency] first audio delta — ${Date.now() - latencyStartRef.current}ms since speech_stopped`);
          latencyStartRef.current = 0;
        }
      }
      if (!mutedRef.current) dispatch({ type: "AI_SPEAKING" });
      scheduleChunk(msg.delta as string);
      break;
    }

    case "response.output_audio.done": {
      {
        const responseId = (msg as { response_id?: string }).response_id;
        if (activeResponseIdRef.current === null || (responseId && responseId !== activeResponseIdRef.current)) break;
      }
      if (explainOpenRef.current) {
        const responseId = (msg as { response_id?: string }).response_id;
        if (responseId !== kbExplanationResponseIdRef.current) break;
      }
      // Schedule AI_DONE to fire once the buffered audio finishes playing
      if (!pendingCall.current) scheduleAIDone();
      break;
    }

    case "response.output_item.added": {
      const item = msg.item as Record<string, unknown>;
      if (item.type === "function_call") {
        pendingCall.current = {
          callId: item.call_id as string,
          name:   item.name   as string,
          args:   "",
        };
      }
      break;
    }

    case "response.function_call_arguments.delta":
      if (pendingCall.current) {
        pendingCall.current.args += (msg.delta as string) ?? "";
      }
      break;

    case "response.function_call_arguments.done":
      if (pendingCall.current) {
        // Use the complete args from this event (more reliable than streaming concat)
        pendingCall.current.args = (msg.arguments as string) ?? pendingCall.current.args;
      }
      break;

    case "response.output_text.delta":
      aiTextBufferRef.current += (msg.delta as string) ?? "";
      break;

    case "response.output_text.done": {
      const textContent = aiTextBufferRef.current.trim();
      setIsChatAITyping(false);
      if (textContent) {
        lastAITranscriptRef.current = textContent;
        // Phase 6's chat is isolated from Phase 1's — see
        // private-documents/phase-6-final-qa/PHASE_6_TEXT_CHAT_ADDENDUM.md.
        if (voicePhaseRef.current === 6) {
          appendPhase6ChatMessage(textContent, "ai");
        } else {
          appendChatMessage(textContent, "ai");
        }
      }
      aiTextBufferRef.current = "";
      break;
    }

    case "response.output_audio_transcript.delta":
      aiAudioTranscriptRef.current += (msg.delta as string) ?? "";
      break;

    case "response.output_audio_transcript.done": {
      const audioTranscript = aiAudioTranscriptRef.current.trim();
      if (audioTranscript) {
        lastAITranscriptRef.current = audioTranscript;
        appendChatMessage(audioTranscript, "ai");
      }
      aiAudioTranscriptRef.current = "";
      break;
    }

    case "response.done": {
      serverResponseActiveRef.current = false;

      if (vc.pendingResponseAfterCancelRef.current) {
        const parked = vc.pendingResponseAfterCancelRef.current;
        vc.pendingResponseAfterCancelRef.current = null;
        // May be a single response.create or an ordered [skip-marker item, response.create]
        // pair (mid-flight intro skip) — send each in order so the marker precedes the create.
        (Array.isArray(parked) ? parked : [parked]).forEach(m => send(m));
      }

      if (vc.pttContextRef.current) {
        const finishedPttContext = vc.pttContextRef.current;
        vc.pttContextRef.current = null;
        if (voicePhaseRef.current !== 1 && voicePhaseRef.current !== 2 && voicePhaseRef.current !== 4 && voicePhaseRef.current !== 5 && voicePhaseRef.current !== 6) {
          send({
            type: "session.update",
            session: { type: "realtime", audio: { input: { turn_detection: { type: "semantic_vad" } } } },
          });
        }
        if (finishedPttContext === 'sustainabilityTerms') {
          send({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text",
              text: "[SYSTEM: The above was a PTT document Q&A about the sustainability disclosure content — it is NOT a Phase 1 answer. Phase 1 is still PAUSED. Q3 (sustainability acknowledgment question) has NOT been answered. Do NOT ask any Phase 1 questions — wait for the customer to tap the confirm button on the disclosure document.]",
            }]},
          });
        }
      }

      const pc = pendingCall.current;
      if (pc) {
        pendingCall.current = null;
        if (vc.audioEndTimer.current) { clearTimeout(vc.audioEndTimer.current); vc.audioEndTimer.current = null; }
        // Guard: if the response was interrupted mid-stream the args JSON may be truncated.
        // Silently drop the call rather than throwing — the AI will re-attempt on the next turn.
        try { JSON.parse(pc.args || "{}"); } catch {
          console.warn("[voice] Dropping truncated function call (interrupted mid-stream):", pc.name);
          break;
        }
        await handleFunctionCall(pc.name, pc.args, pc.callId);
      }
      // Safety: if AI responded without text (e.g. audio slip-through), clear the typing indicator.
      if (chatOpenRef.current) setIsChatAITyping(false);
      // In text mode (chat open), audio events don't fire — trigger AI_DONE here.
      if (chatOpenRef.current && !pc && !mutedRef.current) {
        dispatch({ type: "AI_DONE" });
      }
      // Audio-only response: AI_DONE was already scheduled by response.audio.done

      // For conversational turns (no function call, or a non-submit_answer call), the user's
      // spoken words need a chat bubble. submit_answer creates its own bubble so we skip it.
      if (!chatOpenRef.current && (!pc || pc.name !== "submit_answer")) {
        const buffered = pendingVoiceTranscriptRef.current;
        if (buffered) {
          // Insert BEFORE the last AI bubble — the AI already responded, so we retroactively
          // place the user turn in the correct visual order.
          setChatMessages(prev => {
            const newMsg: ChatMessage = { id: `user-${Date.now()}`, text: buffered, sender: "user", timestamp: new Date() };
            const lastAiIdx = prev.reduce((acc, m, i) => m.sender === "ai" ? i : acc, -1);
            if (lastAiIdx === -1) return [...prev, newMsg];
            return [...prev.slice(0, lastAiIdx), newMsg, ...prev.slice(lastAiIdx)];
          });
          pendingVoiceTranscriptRef.current = null;
        } else {
          // Transcript hasn't arrived yet — flag it so the transcript handler creates the bubble.
          needsTranscriptBubbleRef.current = true;
        }
      }
      break;
    }

    case "conversation.item.input_audio_transcription.delta": {
      if (!pttSearchPendingRef.current || pttSpeculativeSearchRef.current) break;
      const delta = (msg.delta as string | undefined) ?? "";
      pttPartialTranscriptRef.current += delta;
      if (pttPartialTranscriptRef.current.length >= 15) {
        const vectorStoreId = pttVectorStoreRef.current;
        if (vectorStoreId) {
          const querySnapshot = pttPartialTranscriptRef.current;
          pttSpeculativeSearchRef.current = fetch("/api/documents/search", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ query: querySnapshot, vectorStoreId, secondaryVectorStoreId: vc.pttSecondaryStoreRef.current }),
          })
            .then(r => r.json() as Promise<{ results?: string }>)
            .then(d => d.results ?? "")
            .catch(() => "");
        }
      }
      break;
    }

    case "conversation.item.input_audio_transcription.completed": {
      const transcriptItemId = msg.item_id as string | undefined;
      const transcript       = (msg.transcript as string | undefined)?.trim() || null;
      if (!transcript) break;

      // PTT search: run vector search server-side with exact transcript, embed results in response.create.
      // Must be checked BEFORE the stale-transcript guard — with VAD off (turn_detection: null),
      // speech_started never fires so currentSpeechItemIdRef is null and the guard would reject this.
      if (pttSearchPendingRef.current) {
        pttSearchPendingRef.current = false;
        appendChatMessage(transcript, "user");
        const vectorStoreId  = pttVectorStoreRef.current;
        const docLabel       = pttDocLabelRef.current;
        const speculativeHit = pttSpeculativeSearchRef.current;
        const speculativeQuerySnapshot = pttPartialTranscriptRef.current;
        // Reset speculative state for next PTT press
        pttSpeculativeSearchRef.current  = null;
        pttPartialTranscriptRef.current  = "";
        if (!vectorStoreId) {
          send({ type: "response.create", response: { instructions: `You are Digital Onboarding Guide. The document search system is not configured for this session. Apologize briefly. ${langTag()}` } });
          break;
        }
        // Use the speculative search (already in-flight since first delta) if available,
        // otherwise fall back to a fresh search with the full transcript.
        const fullTranscriptSearch = () => fetch("/api/documents/search", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ query: transcript, vectorStoreId, secondaryVectorStoreId: vc.pttSecondaryStoreRef.current }),
        })
          .then(r => r.json() as Promise<{ results?: string }>)
          .then(d => d.results ?? "")
          .catch(() => "");
        const speculativeIsComplete = speculativeHit && speculativeQuerySnapshot.trim() === transcript;
        const searchPromise = speculativeIsComplete
          ? speculativeHit!.then(specResult =>
              (!specResult || specResult.trim() === "" || specResult === "No relevant content found.")
                ? fullTranscriptSearch()
                : specResult
            )
          : fullTranscriptSearch();

        const phase4Data = vc.pttContextRef.current === 'phase4'
          ? buildPhase4PresentationContext(questionsRef.current, savedAnswersRef.current, vc.productRef.current)
          : null;
        const screenContext = phase4Data
          ? `${phase4Data}\n${PHASE4_COST_ANSWER_RULES}`
          : vc.pttContextRef.current === 'phase5'
          ? PHASE5_SCREEN_CONTEXT
          : null;

        searchPromise.then(results => {
          if (!results || results.trim() === "" || results === "No relevant content found.") {
            if (screenContext) {
              send({ type: "response.create", response: { instructions: `Sie sind Digital Onboarding Guide. ${langTag()} Die Suche in ${docLabel} hat für diese Frage nichts geliefert. Ihnen liegen aber die folgenden Informationen zu dem vor, was der Kunde gerade auf dem Bildschirm sieht:\n\n${screenContext}\n\nWenn die Frage des Kunden damit beantwortet werden kann, beantworten Sie sie in 2–3 klaren, natürlichen Sätzen ausschließlich auf Basis dieser Informationen. Andernfalls teilen Sie dem Kunden freundlich mit, dass diese spezifische Information hier nicht verfügbar ist. Fügen Sie keine Informationen aus Ihrem Trainingswissen hinzu.` } });
            } else {
              send({ type: "response.create", response: { instructions: `Sie sind Digital Onboarding Guide. ${langTag()} Die Suche in ${docLabel} hat für diese Frage keine passende Antwort gefunden. Teilen Sie dem Kunden freundlich mit, dass diese spezifische Information nicht im Dokument verfügbar ist, und laden Sie ihn ein, eine andere Frage zu stellen.` } });
            }
          } else if (screenContext) {
            send({ type: "response.create", response: { instructions: `Sie sind Digital Onboarding Guide. ${langTag()} Die Dokumentensuche hat folgende allgemeine Informationen geliefert:\n\n${results}\n\nZusätzlich liegen Ihnen die folgenden Informationen zu dem vor, was der Kunde gerade auf dem Bildschirm sieht:\n\n${screenContext}\n\nBeantworten Sie die Frage des Kunden in 2–3 klaren, natürlichen Sätzen ausschließlich auf Basis dieser beiden Quellen. Bezieht sich die Frage auf etwas, das der Kunde auf dem Bildschirm sieht, nutzen Sie vorrangig die Bildschirm-Informationen. Fügen Sie keine Informationen aus Ihrem Trainingswissen hinzu.` } });
          } else {
            send({ type: "response.create", response: { instructions: `Sie sind Digital Onboarding Guide. ${langTag()} Die Dokumentensuche hat folgende Informationen geliefert:\n\n${results}\n\nBeantworten Sie die Frage des Kunden in 2–3 klaren, natürlichen Sätzen ausschließlich auf Basis dieser Informationen. Fügen Sie keine Informationen aus Ihrem Trainingswissen hinzu.` } });
          }
        }).catch(() => {
          send({ type: "response.create", response: { instructions: `Sie sind Digital Onboarding Guide. ${langTag()} Bei der Dokumentensuche ist ein technischer Fehler aufgetreten. Entschuldigen Sie sich kurz und bitten Sie den Kunden, es erneut zu versuchen.` } });
        });
        break;
      }

      const isPhase1PTT = vc.pttContextRef.current === 'phase1';

      // Guard against stale transcripts from previous speech turns (VAD-mode only — PTT is handled above)
      if (!isPhase1PTT && transcriptItemId && transcriptItemId !== currentSpeechItemIdRef.current) break;

      if (applyPendingTranscriptRef.current) {
        // submit_answer already ran with a fallback label — retroactively fix the bubble
        applyPendingTranscriptRef.current(transcript);
        applyPendingTranscriptRef.current = null;
      } else if (needsTranscriptBubbleRef.current && !chatOpenRef.current) {
        // response.done already fired for a conversational/non-submit turn — insert before last AI bubble
        setChatMessages(prev => {
          const newMsg: ChatMessage = { id: `user-${Date.now()}`, text: transcript, sender: "user", timestamp: new Date() };
          const lastAiIdx = prev.reduce((acc, m, i) => m.sender === "ai" ? i : acc, -1);
          if (lastAiIdx === -1) return [...prev, newMsg];
          return [...prev.slice(0, lastAiIdx), newMsg, ...prev.slice(lastAiIdx)];
        });
        needsTranscriptBubbleRef.current = false;
        pendingVoiceTranscriptRef.current = null;
        vc.persistTranscript(transcript, "user");
      } else {
        // submit_answer hasn't run yet — store for it to pick up
        pendingVoiceTranscriptRef.current = transcript;
      }
      break;
    }

    case "input_audio_buffer.speech_started": {
      const speechItemId = msg.item_id as string | undefined;
      if (speechItemId) currentSpeechItemIdRef.current = speechItemId;
      pendingVoiceTranscriptRef.current = null;
      applyPendingTranscriptRef.current = null;
      needsTranscriptBubbleRef.current = false;
      if (explainOpenRef.current && !vc.explainAwaitConfirmRef.current) resetExplainIdleRef.current();
      if (isAISpeakingRef.current) {
        bargeInActiveRef.current = true;
        setBargeInActive(true);
      }
      // Voice barge-in: flush locally buffered audio so the customer hears silence
      // immediately. semantic_vad handles server-side response cancellation automatically.
      activeSourcesRef.current.forEach(s => { try { s.stop(0); } catch {} });
      activeSourcesRef.current = [];
      nextPlayTimeRef.current = 0;
      activeResponseIdRef.current = null; // reject any further stale audio for the barged-past response
      if (vc.audioEndTimer.current) {
        clearTimeout(vc.audioEndTimer.current);
        vc.audioEndTimer.current = null;
      }
      isAISpeakingRef.current = false;
      setIsAISpeaking(false);
      // Transition state machine to "listening" so the sphere switches to mic
      // visualization immediately (green + voice-reactive) instead of staying purple.
      if (!mutedRef.current) dispatch({ type: "AI_DONE" });
      break;
    }

    case "input_audio_buffer.speech_stopped": {
      latencyStartRef.current = Date.now();
      console.log("[latency] speech_stopped — waiting for AI response");
      break;
    }

    case "response.created": {
      serverResponseActiveRef.current = true;
      vc.awaitingResponseCreatedRef.current = false;
      if (vc.pendingResponseAfterCancelRef.current) {
        send({ type: "response.cancel" });
        break;
      }

      activeResponseIdRef.current = (msg.response as { id: string }).id;
      if (explainOpenRef.current) {
        kbExplanationResponseIdRef.current = (msg.response as { id: string }).id;
        kbExplanationStartedRef.current    = false; // reset so only THIS response's deltas count
      }
      if (latencyStartRef.current) {
        console.log(`[latency] response.created — ${Date.now() - latencyStartRef.current}ms since speech_stopped`);
      }
      break;
    }

    case "error": {
      const err = msg.error as Record<string, unknown>;
      if (err?.code === "response_cancel_not_active") {
        console.debug("[voice] benign: response.cancel lost the race with response completion");
        break;
      }
      console.error("[voice] OpenAI error:", JSON.stringify(err));
      break;
    }
  }
}
