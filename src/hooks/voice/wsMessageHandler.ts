import { useVoiceSessionStore } from "@/store/voiceSessionStore";
import type { ChatMessage } from "./types";
import { buildSystemPrompt, INTRO_INSTRUCTIONS, TERMS1_EXPLAIN_INSTRUCTIONS, TERMS2_EXPLAIN_INSTRUCTIONS, SUSTAINABILITY_EXPLAIN_INSTRUCTIONS, PHASE4_REENTRY_SYSTEM_PROMPT, CONTRACT_DOCUMENT_INTRO_INSTRUCTIONS, FINAL_QA_INTRO_INSTRUCTIONS, ADVISOR_PERSONA, buildPhase4PresentationContext, GERMAN_SPEECH_DIRECTIVE, isAskableNow } from "./prompts";
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
    resetExplainIdleRef, savedAnswersRef, questionsRef,
    send, dispatch, scheduleChunk, scheduleAIDone, handleFunctionCall, setCard,
    setIsAISpeaking, setBargeInActive, setMicAnalyserNode, setIsChatAITyping, setChatMessages,
    appendChatMessage, appendPhase6ChatMessage, voiceThreadIdRef,
  } = vc;

  const langTag = () => langRef.current === "de"
    ? GERMAN_SPEECH_DIRECTIVE
    : `English only.`;

  switch (type) {

    case "session.created": {
      // Phase 3→4 live handoff, OR a cold resume (browser refresh) directly into Phase 4/5/6 —
      // both land here as a fresh connection into an already-past-Phase-1 phase. Do NOT replay
      // the Phase 1 question-list prompt. See private-documents/voice-resume-fix/
      // VOICE_RESUME_FIX_PLAN.md — before this fix, 5 and 6 fell through to the default
      // buildSystemPrompt branch below, resuming the Phase 1 interview instead.
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
                // Phases 4/5/6 are PTT-only — VAD must be off from the very first moment.
                // This used to be semantic_vad, which (with the mic-gate hole above) made
                // the AI spontaneously respond to speech between phase entry and the first
                // PTT press. startPTT/response.done already keep VAD off for these phases;
                // now entry matches. See PHASE_4_5_6_PTT_MIC_GATE_PLAN.md.
                turn_detection: null,
                transcription: { model: "gpt-4o-transcribe" },
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
              transcription: { model: "gpt-4o-transcribe" },
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
          // Phases 4/5/6 are PTT-only too — added late (they were built after the Phase 1
          // PTT conversion), which left the mic streaming continuously there: combined with
          // the semantic_vad the 4/5/6 reconnect branch used to set, the AI heard and
          // answered speech made without holding the button. See
          // private-documents/PHASE_4_5_6_PTT_MIC_GATE_PLAN.md.
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
        // Phase 3→4 live handoff, or a cold resume into Phase 4/5/6 — session-level
        // instructions (sent in session.created above) already direct the AI to greet and
        // walk the customer through the screen. Bare response.create is enough; mirrors the
        // Phase 0/2 pattern of session-level baseline + a triggering response.create.
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
        send({ type: "response.create", response: { instructions: `${ADVISOR_PERSONA(langRef.current)} Der Kunde ist zurückgekehrt und sieht das Nachhaltigkeitsdokument. Begrüßen Sie ihn kurz in 1 Satz, erinnern Sie ihn daran, dass er das Dokument in seinem eigenen Tempo lesen und auf „Ich bestätige" tippen kann, und dass er die Mikrofontaste halten kann, um Fragen zu stellen. Stellen Sie KEINE Phase-1-Fragen. Warten Sie.` } });
      } else if (
        voicePhaseRef.current === 1 && !isRevisitingRef.current &&
        skippedIdsRef.current.size > 0 &&
        questionsRef.current.filter(q =>
          !vc.answeredIdsRef.current.has(q.id) && !skippedIdsRef.current.has(q.id) &&
          isAskableNow(q, questionsRef.current, savedAnswersRef.current)
        ).length === 0
      ) {
        // Circle-back resume: a browser refresh during the circle-back stage — every askable,
        // non-skipped topic is answered, only skipped ones remain. The linear lastQuestionIndex
        // can't express this (a skip that left nothing askable even saved index 0), so the
        // index-based resume would cold-start at topic 1 and ask the wrong question. Drive the
        // circle-back explicitly, exactly like the live branch in handleAnswerConfirmed /
        // handleFunctionCall: land the carousel on the first skipped topic and instruct the AI
        // to ask it. Already-answered skipped topics were subtracted from skippedIds at resume
        // (see the voice-session page), so only genuinely-pending ones are here.
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
        send({
          type: "response.create",
          response: {
            instructions: `${ADVISOR_PERSONA(langRef.current)} Willkommen zurück. Alle Hauptthemen sind beantwortet. Sagen Sie in 1 Satz sachlich, dass Sie noch auf die zurückgestellten Themen zurückkommen, und stellen Sie dann die Frage zum Thema ${firstSkipped.category} (ID: ${firstSkipped.id}). ${qText(firstSkipped.text)} Maximal 2 Sätze. Fragen Sie NUR nach ${firstSkipped.category} (ID: ${firstSkipped.id}). Warten Sie auf die Antwort.`,
          },
        });
      } else {
        // Phase 1 (skip mode or after confirmTerms2) — normal greeting
        send({ type: "response.create" });
      }
      break;
    }

    case "response.output_audio.delta": {
      // Reject stale audio for a response we've already stopAudio()'d/barged past — cancel
      // doesn't retroactively discard audio the server already generated and is still
      // streaming. See private-documents/after-demo/PHASE_0_INTRO_SKIP_PLAN.md.
      //
      // A null activeResponseIdRef means we've explicitly stopped/cancelled/barged and have
      // NOT yet adopted a replacement response (e.g. Phase 0 skip: stopAudio() nulled it and
      // the terms1 create is parked until the intro's response.done). Drop ALL audio in that
      // window — never trust an incoming delta's own response_id to gate it, since a
      // still-generating intro keeps streaming deltas and, when one lacks a usable response_id,
      // the `responseId && …` form below short-circuits to false and lets the intro bleed onto
      // the terms1 screen. See private-documents/PHASE_0_INTRO_SKIP_RACE_PLAN.md.
      {
        const responseId = (msg as { response_id?: string }).response_id;
        if (activeResponseIdRef.current === null || (responseId && responseId !== activeResponseIdRef.current)) break;
      }
      // Tracks any open explanation (general explain_topic flow or the KB two-strike flow) —
      // see private-documents/after-demo/VOICE_EXPLAIN_OVERLAY_FIX_PLAN.md.
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
      // Reject stale audio.done for a response we've already stopAudio()'d/barged past. See
      // private-documents/after-demo/PHASE_0_INTRO_SKIP_PLAN.md. Null id = explicitly stopped
      // with no adopted replacement yet — drop it (matches the delta guard above; keeps a
      // cancelled intro's audio.done from scheduling AI_DONE over the parked terms1 narration).
      {
        const responseId = (msg as { response_id?: string }).response_id;
        if (activeResponseIdRef.current === null || (responseId && responseId !== activeResponseIdRef.current)) break;
      }
      // If an explanation overlay is open and this done event belongs to a cancelled/stale
      // response (not the current explanation's own response), ignore it — stopAudio already
      // cleaned up. See private-documents/after-demo/VOICE_EXPLAIN_OVERLAY_FIX_PLAN.md.
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
          if (voiceThreadIdRef.current) {
            fetch("/api/phase/chat/message", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ threadId: voiceThreadIdRef.current, role: "assistant", content: textContent }),
            }).catch(() => {});
          }
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
        if (voiceThreadIdRef.current) {
          fetch("/api/phase/chat/message", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId: voiceThreadIdRef.current, role: "assistant", content: audioTranscript }),
          }).catch(() => {});
        }
      }
      aiAudioTranscriptRef.current = "";
      break;
    }

    case "response.done": {
      serverResponseActiveRef.current = false;

      // Fire a response.create that was parked while this (now finished or
      // cancelled) response was still alive — the intro-skip path parks the
      // terms1 narration here instead of racing the cancel
      // ("conversation_already_has_active_response").
      if (vc.pendingResponseAfterCancelRef.current) {
        const parked = vc.pendingResponseAfterCancelRef.current;
        vc.pendingResponseAfterCancelRef.current = null;
        // May be a single response.create or an ordered [skip-marker item, response.create]
        // pair (mid-flight intro skip) — send each in order so the marker precedes the create.
        (Array.isArray(parked) ? parked : [parked]).forEach(m => send(m));
      }

      // PTT response cycle complete — restore semantic_vad where it's still wanted.
      // Phases 1, 2, 4, 5, and 6 are PTT-only: keep VAD off between presses. Only restore for
      // Phase 0's own non-terms moments. See private-documents/after-demo/PHASE_1_PTT_PLAN.md.
      if (vc.pttContextRef.current) {
        const finishedPttContext = vc.pttContextRef.current;
        vc.pttContextRef.current = null;
        if (voicePhaseRef.current !== 1 && voicePhaseRef.current !== 2 && voicePhaseRef.current !== 4 && voicePhaseRef.current !== 5 && voicePhaseRef.current !== 6) {
          send({
            type: "session.update",
            session: { type: "realtime", audio: { input: { turn_detection: { type: "semantic_vad" } } } },
          });
        }
        // After a PTT exchange inside the sustainability modal, the conversation history
        // contains the bot answering a question about sustainability content. Without this
        // marker the model confuses that Q&A with Q3 ("Have you received sustainability
        // info?") being implicitly answered and skips to Q4/Q5 or asks Q3 oddly.
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
      // Accumulate partial transcript and fire a speculative vector search as soon as we have enough text.
      // This runs the search in parallel with the remaining transcription so the result is ready (or nearly
      // ready) by the time transcription.completed fires — cutting 1–2 s off PTT response latency.
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
            body:    JSON.stringify({ query: querySnapshot, vectorStoreId }),
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
        const vectorStoreId  = pttVectorStoreRef.current;
        const docLabel       = pttDocLabelRef.current;
        const speculativeHit = pttSpeculativeSearchRef.current;
        // Snapshot of the partial transcript the speculative search actually ran against — frozen
        // at whatever it was when the search fired, since later deltas early-return once
        // pttSpeculativeSearchRef.current is set (see the delta handler above).
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
          body:    JSON.stringify({ query: transcript, vectorStoreId }),
        })
          .then(r => r.json() as Promise<{ results?: string }>)
          .then(d => d.results ?? "")
          .catch(() => "");
        // Only trust the speculative hit when the snapshot it searched IS the complete utterance
        // (common for short questions that finish within the 15-char trigger). If more speech
        // came in after that snapshot was taken, the partial can land mid-word — e.g. German
        // compound nouns like "Vermögensverwalter" truncated to "Was ist ein Ver" — and return a
        // non-empty but WRONG/irrelevant result that an empty-check alone would never catch.
        // Always re-run with the full transcript in that case, regardless of what the
        // speculative search returned.
        const speculativeIsComplete = speculativeHit && speculativeQuerySnapshot.trim() === transcript;
        const searchPromise = speculativeIsComplete
          ? speculativeHit!.then(specResult =>
              (!specResult || specResult.trim() === "" || specResult === "No relevant content found.")
                ? fullTranscriptSearch()
                : specResult
            )
          : fullTranscriptSearch();

        // Phase 4: the shared store only holds GENERIC fee FAQ content — questions about
        // the customer's OWN presentation (their amounts, their computed fees, their
        // product) need the on-screen data injected alongside the search results, and the
        // "use ONLY the search results" wording relaxed to cover both sources. See
        // private-documents/PHASE_4_PTT_PRESENTATION_CONTEXT_PLAN.md.
        const phase4Context = vc.pttContextRef.current === 'phase4'
          ? buildPhase4PresentationContext(questionsRef.current, savedAnswersRef.current, vc.productRef.current)
          : null;

        searchPromise.then(results => {
          if (!results || results.trim() === "" || results === "No relevant content found.") {
            if (phase4Context) {
              send({ type: "response.create", response: { instructions: `Sie sind Digital Onboarding Guide. ${langTag()} Die Suche in ${docLabel} hat für diese Frage nichts geliefert. Ihnen liegen aber die folgenden konkreten Daten der Veranlagung dieses Kunden vor:\n\n${phase4Context}\n\nWenn die Frage des Kunden damit beantwortet werden kann, beantworten Sie sie in 2–3 klaren, natürlichen Sätzen ausschließlich auf Basis dieser Daten. Andernfalls teilen Sie dem Kunden freundlich mit, dass diese spezifische Information hier nicht verfügbar ist. Fügen Sie keine Informationen aus Ihrem Trainingswissen hinzu.` } });
            } else {
              send({ type: "response.create", response: { instructions: `Sie sind Digital Onboarding Guide. ${langTag()} Die Suche in ${docLabel} hat für diese Frage keine passende Antwort gefunden. Teilen Sie dem Kunden freundlich mit, dass diese spezifische Information nicht im Dokument verfügbar ist, und laden Sie ihn ein, eine andere Frage zu stellen.` } });
            }
          } else if (phase4Context) {
            send({ type: "response.create", response: { instructions: `Sie sind Digital Onboarding Guide. ${langTag()} Die Dokumentensuche hat folgende allgemeine Informationen geliefert:\n\n${results}\n\nZusätzlich liegen Ihnen die folgenden konkreten Daten der Veranlagung dieses Kunden vor:\n\n${phase4Context}\n\nBeantworten Sie die Frage des Kunden in 2–3 klaren, natürlichen Sätzen ausschließlich auf Basis dieser beiden Quellen. Bei Fragen zu den konkreten Zahlen oder Details der Veranlagung des Kunden nutzen Sie dessen Daten. Fügen Sie keine Informationen aus Ihrem Trainingswissen hinzu.` } });
          } else {
            send({ type: "response.create", response: { instructions: `Sie sind Digital Onboarding Guide. ${langTag()} Die Dokumentensuche hat folgende Informationen geliefert:\n\n${results}\n\nBeantworten Sie die Frage des Kunden in 2–3 klaren, natürlichen Sätzen ausschließlich auf Basis dieser Informationen. Fügen Sie keine Informationen aus Ihrem Trainingswissen hinzu.` } });
          }
        }).catch(() => {
          send({ type: "response.create", response: { instructions: `Sie sind Digital Onboarding Guide. ${langTag()} Bei der Dokumentensuche ist ein technischer Fehler aufgetreten. Entschuldigen Sie sich kurz und bitten Sie den Kunden, es erneut zu versuchen.` } });
        });
        break;
      }

      // Phase 1 PTT: VAD is off, so speech_started never fires and currentSpeechItemIdRef stays
      // stale — the guard below would otherwise silently drop every Phase 1 PTT transcript
      // before it reaches the bubble-insertion logic. Bypass explicitly instead. See
      // private-documents/after-demo/PHASE_1_PTT_PLAN.md.
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
      if (explainOpenRef.current) resetExplainIdleRef.current();
      // If AI was actively speaking, suppress the auto-modal until the new AI response
      // starts sending audio — prevents the previous card's modal from incorrectly opening
      // during the 1–2s gap between barge-in and the navigate/submit function call.
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
      // Barged before birth: the customer already moved past this response (intro
      // skip) while it was still being created. Cancel it now and keep
      // activeResponseIdRef null so its audio is never accepted — the parked
      // follow-up response fires on this response's response.done. See
      // private-documents/PHASE_0_INTRO_SKIP_RACE_PLAN.md.
      if (vc.pendingResponseAfterCancelRef.current) {
        send({ type: "response.cancel" });
        break;
      }
      // See activeResponseIdRef's declaration in useVoiceSession.ts — rejects stale audio from
      // a response we've since stopped/cancelled/barged past.
      activeResponseIdRef.current = (msg.response as { id: string }).id;
      if (explainOpenRef.current) {
        // Track which response is the current explanation (general or KB) so stale
        // cancelled-response events are filtered out. See
        // private-documents/after-demo/VOICE_EXPLAIN_OVERLAY_FIX_PLAN.md.
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
      // Benign race: a response.cancel (from stopAudio() on a confirm/back tap) reached the server
      // just after it had already finished the response on its own — the client still had
      // serverResponseActiveRef true, but there was nothing left to cancel. It cannot be cleanly
      // prevented (it's a client/server timing race with no ack), and nothing breaks. Log it
      // quietly so it doesn't surface as a scary red error in dev.
      if (err?.code === "response_cancel_not_active") {
        console.debug("[voice] benign: response.cancel lost the race with response completion");
        break;
      }
      console.error("[voice] OpenAI error:", JSON.stringify(err));
      // Most other OpenAI API errors are non-fatal too — the session WS is still open. Only hard
      // connection failures are caught by ws.onclose. Avoid killing the session on API-level errors.
      break;
    }
  }
}
