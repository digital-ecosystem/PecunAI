import { useVoiceSessionStore } from "@/store/voiceSessionStore";
import type { ChatMessage } from "./types";
import { buildSystemPrompt, INTRO_INSTRUCTIONS, TERMS1_EXPLAIN_INSTRUCTIONS, TERMS2_EXPLAIN_INSTRUCTIONS, SUSTAINABILITY_EXPLAIN_INSTRUCTIONS, PHASE4_REENTRY_SYSTEM_PROMPT } from "./prompts";
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
    sessionConfiguredRef, initialIndexRef, micStreamRef, micGrantedRef, audioCtxRef,
    voicePhaseRef, termsSubStepRef, stateRef, chatOpenRef, pttActiveRef, mutedRef,
    explainOpenRef, serverResponseActiveRef, pendingCall, aiTextBufferRef, aiAudioTranscriptRef,
    lastAITranscriptRef, pendingVoiceTranscriptRef, currentSpeechItemIdRef,
    applyPendingTranscriptRef, needsTranscriptBubbleRef, knowledgeBlockerNextQRef,
    kbExplanationStartedRef, kbExplanationResponseIdRef, isAISpeakingRef, bargeInActiveRef,
    latencyStartRef, pttSearchPendingRef, pttSpeculativeSearchRef, pttPartialTranscriptRef,
    pttVectorStoreRef, pttDocLabelRef, activeSourcesRef, nextPlayTimeRef, wsRef,
    skippedIdsRef, isRevisitingRef, langRef, micSourceRef, workletNodeRef, micAnalyserRef,
    resetExplainIdleRef, savedAnswersRef, questionsRef,
    send, dispatch, scheduleChunk, scheduleAIDone, handleFunctionCall, setCard,
    setIsAISpeaking, setBargeInActive, setMicAnalyserNode, setIsChatAITyping, setChatMessages,
    appendChatMessage, voiceThreadIdRef,
  } = vc;

  const langTag = () => langRef.current === "de"
    ? `Sprechen Sie Deutsch mit formeller Anrede „Sie".`
    : `English only.`;

  switch (type) {

    case "session.created": {
      // Phase 3→4 reconnect — this connection exists solely to re-enter the voice flow after
      // the silent Personal Info phase. Do NOT replay the Phase 1 question-list prompt.
      if (voicePhaseRef.current === 4) {
        send({
          type: "session.update",
          session: {
            type:              "realtime",
            model:             "gpt-realtime-1.5",
            output_modalities: ["audio"],
            instructions:      PHASE4_REENTRY_SYSTEM_PROMPT(langRef.current),
            tools:             TOOLS,
            tool_choice:       "auto",
            audio: {
              input: {
                format: { type: "audio/pcm", rate: 24000 },
                turn_detection: { type: "semantic_vad" },
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
          instructions:      buildSystemPrompt(questionsRef.current, resumeIdx, micGrantedRef.current, skippedIdsRef.current, isRevisitingRef.current, langRef.current),
          tools:             TOOLS,
          tool_choice:       "auto",
          audio: {
            input: {
              format: { type: "audio/pcm", rate: 24000 },
              turn_detection: { type: "semantic_vad" },
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
          if (voicePhaseRef.current === 2 && !pttActiveRef.current) return;
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
      if (voicePhaseRef.current === 4) {
        // Phase 3→4 reconnect — session-level instructions (PHASE4_REENTRY_SYSTEM_PROMPT,
        // sent in session.created above) already direct the AI to greet and transition.
        // Bare response.create is enough; mirrors the Phase 0/2 pattern of session-level
        // baseline + a triggering response.create. Real Phase 4 narration logic (cost
        // breakdown, confirm_investment tool, etc.) is a separate, not-yet-built milestone.
        send({ type: "response.create" });
      } else if (voicePhaseRef.current === 0 && termsSubStepRef.current === 'terms2') {
        // Resume: customer already confirmed terms1 — go straight to terms2 explanation
        send({ type: "response.create", response: { instructions: TERMS2_EXPLAIN_INSTRUCTIONS(langRef.current) } });
      } else if (voicePhaseRef.current === 0) {
        // Fresh start: welcome intro before terms
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
                `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()}`,
                `Die Sitzung wird fortgesetzt. Begrüßen Sie den Kunden herzlich zurück in 1 Satz.`,
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
        send({ type: "response.create", response: { instructions: `Sie sind PecunAI — ein warmherziger Anlageberater. ${langTag()} Der Kunde ist zurückgekehrt und sieht das Nachhaltigkeitsdokument. Begrüßen Sie ihn herzlich in 1 Satz, erinnern Sie ihn daran, dass er das Dokument in seinem eigenen Tempo lesen und auf „Ich bestätige" tippen kann, und dass er die Mikrofontaste halten kann, um Fragen zu stellen. Stellen Sie KEINE Phase-1-Fragen. Warten Sie.` } });
      } else {
        // Phase 1 (skip mode or after confirmTerms2) — normal greeting
        send({ type: "response.create" });
      }
      break;
    }

    case "response.output_audio.delta": {
      if (knowledgeBlockerNextQRef.current) {
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
      // If KB overlay is active and this done event belongs to the cancelled response
      // (not the KB explanation response), ignore it — stopAudio already cleaned up.
      if (knowledgeBlockerNextQRef.current) {
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
        appendChatMessage(textContent, "ai");
        if (voiceThreadIdRef.current) {
          fetch("/api/phase/chat/message", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId: voiceThreadIdRef.current, role: "assistant", content: textContent }),
          }).catch(() => {});
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

      // PTT response cycle complete — restore semantic_vad so Phase 1 interview continues normally.
      // Phase 2 and Phase 4 are PTT-only: keep VAD off between presses. Only restore for Phase 0/1.
      if (vc.pttContextRef.current) {
        const finishedPttContext = vc.pttContextRef.current;
        vc.pttContextRef.current = null;
        if (voicePhaseRef.current !== 2 && voicePhaseRef.current !== 4) {
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
        // Reset speculative state for next PTT press
        pttSpeculativeSearchRef.current  = null;
        pttPartialTranscriptRef.current  = "";
        if (!vectorStoreId) {
          send({ type: "response.create", response: { instructions: `You are PecunAI. The document search system is not configured for this session. Apologize briefly. ${langTag()}` } });
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
        // speculativeHit is a Promise (never null once partial transcript hit 15 chars) —
        // ?? only catches null/undefined, NOT an empty resolved value. For short German
        // compound words like "Vermögensverwalter" the partial query ("Was ist ein Ver")
        // often returns nothing. We must retry with the full exact transcript in that case.
        const searchPromise = speculativeHit
          ? speculativeHit.then(specResult =>
              (!specResult || specResult.trim() === "" || specResult === "No relevant content found.")
                ? fullTranscriptSearch()
                : specResult
            )
          : fullTranscriptSearch();

        searchPromise.then(results => {
          if (!results || results.trim() === "" || results === "No relevant content found.") {
            send({ type: "response.create", response: { instructions: `Sie sind PecunAI. ${langTag()} Die Suche in ${docLabel} hat für diese Frage keine passende Antwort gefunden. Teilen Sie dem Kunden freundlich mit, dass diese spezifische Information nicht im Dokument verfügbar ist, und laden Sie ihn ein, eine andere Frage zu stellen.` } });
          } else {
            send({ type: "response.create", response: { instructions: `Sie sind PecunAI. ${langTag()} Die Dokumentensuche hat folgende Informationen geliefert:\n\n${results}\n\nBeantworten Sie die Frage des Kunden in 2–3 klaren, natürlichen Sätzen ausschließlich auf Basis dieser Informationen. Fügen Sie keine Informationen aus Ihrem Trainingswissen hinzu.` } });
          }
        }).catch(() => {
          send({ type: "response.create", response: { instructions: `Sie sind PecunAI. ${langTag()} Bei der Dokumentensuche ist ein technischer Fehler aufgetreten. Entschuldigen Sie sich kurz und bitten Sie den Kunden, es erneut zu versuchen.` } });
        });
        break;
      }

      // Guard against stale transcripts from previous speech turns (VAD-mode only — PTT is handled above)
      if (transcriptItemId && transcriptItemId !== currentSpeechItemIdRef.current) break;

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
      if (knowledgeBlockerNextQRef.current) {
        // Track which response is the KB explanation so stale cancelled-response events
        // (which share the same knowledgeBlockerNextQRef window) are filtered out.
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
      console.error("[voice] OpenAI error:", JSON.stringify(err));
      // Most OpenAI API errors (e.g. response.cancel with no active response) are non-fatal —
      // the session WS is still open. Only hard connection failures are caught by ws.onclose.
      // Avoid killing the session on every API-level error.
      break;
    }
  }
}
