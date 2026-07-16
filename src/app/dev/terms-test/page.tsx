"use client";

/**
 * DEV-ONLY harness — walks the full phase-transition journey with the shell's
 * exact wiring, no voice session needed: terms1 entry morph → in-frame
 * crossfade to terms2 → frame-collapse into the Phase 1 orb → orb-consume
 * morph into Phase 2's product frame → revisit collapse back to the orb.
 * Safe to delete.
 */

import { useState, useEffect, useRef } from "react";
import VoiceTermsPhase from "@/components/voice/VoiceTermsPhase";
import VoiceProductPhase from "@/components/voice/VoiceProductPhase";
import { PhaseOneNeuralModel } from "@/components/voice/PhaseOneNeuralModel";
import type { FrameRect } from "@/components/voice/frameMath";
import type { ProductData } from "@/hooks/useVoiceSession";

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
  const [step, setStep] = useState<"terms1" | "terms2" | "phase1" | "phase2">("terms1");
  const entryRectRef = useRef<FrameRect | null>(null);

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
          onConfirm={() => {}}
          onRevisit={() => setStep("phase1")}
          entryOrbOrigin={orbOrigin}
          onFrameRect={(rect) => { entryRectRef.current = rect; }}
        />
      )}
    </>
  );
}
