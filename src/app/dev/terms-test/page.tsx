"use client";

/**
 * DEV-ONLY harness — walks the full phase-transition journey with the shell's
 * exact wiring, no voice session needed: terms1 entry morph → in-frame
 * crossfade to terms2 → frame-collapse into the Phase 1 orb → orb-consume
 * morph into Phase 2's product frame → revisit collapse back to the orb.
 * Safe to delete.
 */

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import VoiceTermsPhase from "@/components/voice/VoiceTermsPhase";
import VoiceProductPhase from "@/components/voice/VoiceProductPhase";
import VoiceInvestmentForm from "@/components/voice/VoiceInvestmentForm";
import VoiceContractDocuments from "@/components/voice/VoiceContractDocuments";
import VoiceSessionReview from "@/components/voice/VoiceSessionReview";
import VoiceSphere from "@/components/voice/VoiceSphere";
import { PhaseOneNeuralModel } from "@/components/voice/PhaseOneNeuralModel";
import { SphereToFrameTransition } from "@/components/voice/SphereToFrameTransition";
import type { FrameRect } from "@/components/voice/frameMath";
import type { ProductData } from "@/hooks/useVoiceSession";

const BG = "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)";

const FAKE_PRODUCT: ProductData = {
  id: "dev",
  name: "Balance",
  fullName: "Balance Portfolio",
  description: "Dev harness product",
  fileName: "/products/dev-placeholder.pdf",
  from: 3,
  to: 4,
  risk: "Moderat",
  riskType: "balanced",
  sri: "3",
  score: 50,
  aiSettings: { prompt: "" },
};

export default function TermsTestPage() {
  const [step, setStep] = useState<"terms1" | "terms2" | "phase1" | "phase2" | "pause" | "form" | "phase4" | "phase5" | "phase6">("terms1");
  const entryRectRef = useRef<FrameRect | null>(null);

  // Phase 2 → 3 privacy-pause seams (mirrors the shell).
  const [pauseRect, setPauseRect] = useState<FrameRect | null>(null);
  const [pauseRevealed, setPauseRevealed] = useState(false);

  // Phase 3 → 4 grow-in phantom (mirrors the shell's PHASE4_GROW_MS choreography).
  const [p4Grow, setP4Grow] = useState(false);
  useEffect(() => {
    if (step !== "phase4") return;
    setP4Grow(true);
    const t = window.setTimeout(() => setP4Grow(false), 780);
    return () => window.clearTimeout(t);
  }, [step]);

  // Mirrors the shell's Phase 1 orb wrapper + per-frame rect poll.
  const [orbOrigin, setOrbOrigin] = useState<{ x: number; y: number } | null>(null);
  const orbWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (step !== "phase1") return;
    let raf = 0;
    let alive = true;
    const tick = () => {
      const rect = orbWrapperRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0) {
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        setOrbOrigin(prev =>
          prev && Math.abs(prev.x - x) < 0.75 && Math.abs(prev.y - y) < 0.75 ? prev : { x, y }
        );
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [step]);

  // Mirrors the shell: the handoff rect is consumed at Phase 1 mount, then cleared.
  useEffect(() => {
    if (step !== "phase1") return;
    const t = window.setTimeout(() => { entryRectRef.current = null; }, 1500);
    return () => window.clearTimeout(t);
  }, [step]);

  return (
    <>
      <div id="state-readout" className="fixed top-2 left-2 z-[99] text-xs font-mono" data-step={step}>
        step={step}
        <button
          id="reset-btn"
          className="ml-3 px-2 py-0.5 rounded border border-blue-300 text-blue-600"
          onClick={() => { entryRectRef.current = null; setStep("terms1"); }}
        >
          Reset
        </button>
        {step === "phase1" && (
          <button
            id="to-phase2-btn"
            className="ml-2 px-2 py-0.5 rounded border border-blue-300 text-blue-600"
            onClick={() => setStep("phase2")}
          >
            → Phase 2
          </button>
        )}
        {step === "phase4" && (
          <button
            id="to-phase5-btn"
            className="ml-2 px-2 py-0.5 rounded border border-blue-300 text-blue-600"
            onClick={() => setStep("phase5")}
          >
            → Phase 5
          </button>
        )}
        {step === "phase5" && (
          <button
            id="to-phase6-btn"
            className="ml-2 px-2 py-0.5 rounded border border-blue-300 text-blue-600"
            onClick={() => setStep("phase6")}
          >
            → Phase 6
          </button>
        )}
      </div>

      {(step === "terms1" || step === "terms2") && (
        <VoiceTermsPhase
          which={step}
          isSpeaking={false}
          onConfirm={async () => {
            if (step === "terms1") setStep("terms2");
            else setStep("phase1");
          }}
          onPTTStart={() => {}}
          onPTTRelease={() => {}}
          onExitRect={(rect) => { entryRectRef.current = rect; }}
        />
      )}

      {step === "phase1" && (
        <div
          className="fixed inset-0 flex flex-col overflow-hidden"
          style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
        >
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div ref={orbWrapperRef} className="relative z-10" style={{ width: 380, height: 380 }} />
          </div>
          <div className="relative z-20 -mt-24 mb-8 h-[240px] flex items-center justify-center">
            <p className="text-sm" style={{ color: "rgba(59,130,246,0.6)" }}>[ Phase 1 carousel here ]</p>
          </div>
          {orbOrigin && (
            <PhaseOneNeuralModel
              shape="orb"
              frameRect={null}
              initialFrameRect={entryRectRef.current}
              sphereCenter={orbOrigin}
              sphereRadius={380 * 0.3}
              isSpeaking={false}
              isListening={false}
              containerWidth={typeof window !== "undefined" ? window.innerWidth : 0}
              containerHeight={typeof window !== "undefined" ? window.innerHeight : 0}
            />
          )}
        </div>
      )}

      {step === "phase2" && (
        <VoiceProductPhase
          product={FAKE_PRODUCT}
          isSpeaking={false}
          isListening={false}
          isMuted={false}
          sessionState="listening"
          onMuteToggle={() => {}}
          onPTTStart={() => {}}
          onPTTRelease={() => {}}
          onConfirm={() => {
            // Mirrors advanceToPersonalInfo: product frame collapses into the
            // pause screen's sphere.
            setPauseRect(entryRectRef.current);
            entryRectRef.current = null;
            setPauseRevealed(false);
            setStep("pause");
          }}
          onRevisit={() => setStep("phase1")}
          entryOrbOrigin={orbOrigin}
          onFrameRect={(rect) => { entryRectRef.current = rect; }}
        />
      )}

      {step === "pause" && (
        <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: BG }}>
          <div className="w-full px-6 py-5">
            <h1 className="text-2xl font-bold text-center" style={{ color: "#2563eb" }}>Vox.2</h1>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div animate={{ opacity: pauseRevealed ? 1 : 0 }} transition={{ duration: 0.35 }}>
              <VoiceSphere isActive isSpeaking={false} isListening={false} size={380} analyserNode={null} micAnalyserNode={null} />
            </motion.div>
          </div>
          {pauseRect && (
            <SphereToFrameTransition
              direction="toOrb"
              sphereCenter={{ x: window.innerWidth / 2, y: 84 + (window.innerHeight - 84) / 2 }}
              sphereRadius={380 * 0.3}
              contentRect={pauseRect}
              onMostlyDone={() => setPauseRevealed(true)}
              onComplete={() => setPauseRect(null)}
            />
          )}
          <button
            id="to-form-btn"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded border border-blue-300 text-blue-600 text-sm bg-white"
            onClick={() => setStep("form")}
          >
            → Phase 3
          </button>
        </div>
      )}

      {step === "form" && (
        <div className="fixed inset-0 overflow-hidden" style={{ background: BG }}>
          <motion.div
            className="max-w-md mx-auto mt-24 rounded-3xl bg-white p-8"
            style={{ boxShadow: "0 20px 60px rgba(59,130,246,0.15)" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
          >
            <h2 className="text-lg font-semibold mb-2" style={{ color: "rgba(15,23,42,0.9)" }}>[ Personal Info form ]</h2>
            <p className="text-sm" style={{ color: "rgba(100,116,139,0.8)" }}>Silent phase — voice disconnected.</p>
            <button
              id="to-phase4-btn"
              className="mt-4 px-4 py-2 rounded border border-blue-300 text-blue-600 text-sm"
              onClick={() => setStep("phase4")}
            >
              → Phase 4
            </button>
          </motion.div>
          <motion.div
            className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center"
            style={{ paddingTop: 84 }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 0.1 }}
            transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
          >
            <VoiceSphere isActive isSpeaking={false} isListening={false} size={380} analyserNode={null} micAnalyserNode={null} />
          </motion.div>
        </div>
      )}

      {step === "phase4" && (
        <>
          <VoiceInvestmentForm
            product={FAKE_PRODUCT}
            questions={[]}
            answers={{}}
            isSpeaking={false}
            sessionState="listening"
            onPTTStart={() => {}}
            onPTTRelease={() => {}}
            onConfirm={() => {}}
            entryOrbOrigin={{ x: window.innerWidth / 2, y: 84 + (window.innerHeight - 84) / 2 }}
            entryDelayMs={780}
            onFrameRect={(rect) => { entryRectRef.current = rect; }}
          />
          {p4Grow && (
            <motion.div
              className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center"
              style={{ paddingTop: 84 }}
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <VoiceSphere isActive isSpeaking={false} isListening={false} size={380} analyserNode={null} micAnalyserNode={null} />
            </motion.div>
          )}
        </>
      )}

      {step === "phase5" && (
        <VoiceContractDocuments
          sessionId="dev"
          questions={[]}
          answers={{}}
          isSpeaking={false}
          sessionState="listening"
          onPTTStart={() => {}}
          onPTTRelease={() => {}}
          onConfirm={() => {}}
          entryFrameRect={entryRectRef.current}
          onFrameRect={(rect) => { entryRectRef.current = rect; }}
        />
      )}

      {step === "phase6" && (
        <VoiceSessionReview
          isSpeaking={false}
          sessionState="listening"
          analyserNode={null}
          micAnalyserNode={null}
          onPTTStart={() => {}}
          onPTTRelease={() => {}}
          onConfirm={() => {}}
          onChatClick={() => {}}
          isChatOpen={false}
          entryFrameRect={entryRectRef.current}
        />
      )}
    </>
  );
}
